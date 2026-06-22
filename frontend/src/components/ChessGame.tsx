"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
} from "react-chessboard";

type EngineMoveResponse = {
  move: string;
  resulting_fen: string;
};

type HealthResponse = {
  status: string;
};

type EngineReadiness = "waking" | "slow" | "ready";

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://ml-chess-engine.onrender.com"
    : "http://127.0.0.1:8000";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
  /\/$/,
  "",
);

const STARTING_FEN = new Chess().fen();
const HEALTH_REQUEST_TIMEOUT_MS = 10_000;
const HEALTH_RETRY_DELAY_MS = 3_000;
const SLOW_WAKE_THRESHOLD_MS = 60_000;

export default function ChessGame() {
  const gameRef = useRef(new Chess());
  const wakeStartedAtRef = useRef<number | null>(null);

  const [position, setPosition] = useState(STARTING_FEN);
  const [message, setMessage] = useState("Your turn");
  const [isThinking, setIsThinking] = useState(false);
  const [readiness, setReadiness] = useState<EngineReadiness>("waking");
  const [healthCheckVersion, setHealthCheckVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let requestController: AbortController | undefined;

    wakeStartedAtRef.current ??= Date.now();

    async function checkHealth(): Promise<void> {
      requestController = new AbortController();
      const requestTimeout = setTimeout(
        () => requestController?.abort(),
        HEALTH_REQUEST_TIMEOUT_MS,
      );

      try {
        const response = await fetch(`${API_URL}/health`, {
          signal: requestController.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Health request failed: ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        if (data.status !== "ok") {
          throw new Error("Unexpected health response");
        }

        if (!cancelled) {
          setReadiness("ready");
        }
        return;
      } catch {
        // The visible warm-up state communicates expected cold-start failures.
      } finally {
        clearTimeout(requestTimeout);
      }

      if (cancelled) {
        return;
      }

      const wakeStartedAt = wakeStartedAtRef.current ?? Date.now();
      setReadiness(
        Date.now() - wakeStartedAt >= SLOW_WAKE_THRESHOLD_MS
          ? "slow"
          : "waking",
      );
      retryTimeout = setTimeout(checkHealth, HEALTH_RETRY_DELAY_MS);
    }

    void checkHealth();

    return () => {
      cancelled = true;
      requestController?.abort();
      if (retryTimeout !== undefined) {
        clearTimeout(retryTimeout);
      }
    };
  }, [healthCheckVersion]);

  async function requestEngineMove(fen: string): Promise<void> {
    setIsThinking(true);
    setMessage("Engine thinking...");

    try {
      const response = await fetch(`${API_URL}/engine-move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fen }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `Engine request failed with ${response.status}: ${errorBody}`,
        );
      }

      const data = (await response.json()) as EngineMoveResponse;

      const from = data.move.slice(0, 2) as Square;
      const to = data.move.slice(2, 4) as Square;
      const promotion = data.move[4] as
        | "q"
        | "r"
        | "b"
        | "n"
        | undefined;

      gameRef.current.move({
        from,
        to,
        promotion: promotion ?? "q",
      });

      setPosition(gameRef.current.fen());

      if (gameRef.current.isGameOver()) {
        setMessage("Game over");
      } else {
        setMessage("Your turn");
      }
    } catch (error) {
      console.error(error);
      setMessage("The engine request failed");
    } finally {
      setIsThinking(false);
    }
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (
      targetSquare === null ||
      isThinking ||
      readiness !== "ready" ||
      gameRef.current.turn() !== "w"
    ) {
      return false;
    }

    try {
      gameRef.current.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });

      const updatedFen = gameRef.current.fen();
      setPosition(updatedFen);

      if (gameRef.current.isGameOver()) {
        setMessage("Game over");
        return true;
      }

      void requestEngineMove(updatedFen);

      return true;
    } catch {
      setMessage("Illegal move");
      return false;
    }
  }

  function resetGame(): void {
    gameRef.current.reset();
    setPosition(gameRef.current.fen());
    setMessage("Your turn");
    setIsThinking(false);
  }

  const chessboardOptions = {
    position,
    boardOrientation: "white" as const,
    onPieceDrop: handlePieceDrop,
    allowDragging: readiness === "ready" && !isThinking,
  };

  const readinessMessage =
    readiness === "slow"
      ? "The free engine is taking longer than expected to wake up. We will keep trying."
      : "Waking the free chess engine. This can take up to a minute.";

  return (
    <>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 flex items-center gap-2 text-sm text-zinc-600"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            readiness === "ready" ? "bg-emerald-500" : "bg-amber-500"
          }`}
          aria-hidden="true"
        />
        {readiness === "ready" ? "Engine API online" : "Waking engine..."}
      </p>

      <section className="mt-8 grid gap-6 md:grid-cols-[minmax(0,560px)_1fr]">
      <div className="relative w-full max-w-[560px]">
        <Chessboard options={chessboardOptions} />

        {readiness !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-zinc-950/70 p-6 text-center text-white">
            <div role="status" aria-live="polite" className="max-w-sm">
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              <p className="mt-4 font-medium">Preparing the engine</p>
              <p className="mt-2 text-sm text-zinc-200">
                {readinessMessage}
              </p>
              {readiness === "slow" && (
                <button
                  type="button"
                  onClick={() => setHealthCheckVersion((version) => version + 1)}
                  className="mt-4 rounded bg-white px-4 py-2 text-sm font-medium text-zinc-900"
                >
                  Check again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">
          Game
        </h2>

        <p
          className="mt-2 text-sm text-zinc-600"
          aria-live="polite"
        >
          {readiness === "ready" ? message : readinessMessage}
        </p>

        <button
          type="button"
          onClick={resetGame}
          disabled={isThinking || readiness !== "ready"}
          className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset game
        </button>
      </aside>
      </section>
    </>
  );
}
