"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const LIGHT_SQUARE = "#edeed1";
const DARK_SQUARE = "#779952";
const HIGHLIGHT_LIGHT = "#cbde7b";
const HIGHLIGHT_DARK = "#86ac30";

function isLightSquare(square: string): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return (file + rank) % 2 !== 0;
}

function squareHighlight(square: string): string {
  return isLightSquare(square) ? HIGHLIGHT_LIGHT : HIGHLIGHT_DARK;
}

export default function ChessGame() {
  const gameRef = useRef(new Chess());
  const moveListRef = useRef<HTMLDivElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);

  const [position, setPosition] = useState(STARTING_FEN);
  const [message, setMessage] = useState("Your turn");
  const [isThinking, setIsThinking] = useState(false);
  const [readiness, setReadiness] = useState<EngineReadiness>("waking");
  const [healthCheckVersion, setHealthCheckVersion] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

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

  useEffect(() => {
    const moveList = moveListRef.current;
    if (!moveList) {
      return;
    }

    moveList.scrollTop = moveList.scrollHeight;
  }, [moves.length]);

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

      const moveResult = gameRef.current.move({
        from,
        to,
        promotion: promotion ?? "q",
      });

      setMoves((currentMoves) => [...currentMoves, moveResult.san]);
      setLastMove({ from: moveResult.from, to: moveResult.to });
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
      const moveResult = gameRef.current.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });

      setMoves((currentMoves) => [...currentMoves, moveResult.san]);
      setLastMove({ from: moveResult.from, to: moveResult.to });

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
    setMoves([]);
    setLastMove(null);
    setMessage("Your turn");
    setIsThinking(false);
  }

  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = {
      backgroundColor: squareHighlight(lastMove.from),
    };
    squareStyles[lastMove.to] = {
      backgroundColor: squareHighlight(lastMove.to),
    };
  }

  const chessboardOptions = {
    position,
    boardOrientation: "white" as const,
    onPieceDrop: handlePieceDrop,
    allowDragging: readiness === "ready" && !isThinking,
    lightSquareStyle: { backgroundColor: LIGHT_SQUARE },
    darkSquareStyle: { backgroundColor: DARK_SQUARE },
    squareStyles,
    showNotation: true,
  };

  const readinessMessage =
    readiness === "slow"
      ? "The free engine is taking longer than expected to wake up. We will keep trying."
      : "Waking the free chess engine. This can take up to a minute.";

  const moveRows: { white: string; black?: string }[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    moveRows.push({ white: moves[index], black: moves[index + 1] });
  }

  const lastMoveIndex = moves.length - 1;
  const lastRowIndex =
    lastMoveIndex >= 0 ? Math.floor(lastMoveIndex / 2) : -1;
  const lastMoveIsWhite = lastMoveIndex >= 0 && lastMoveIndex % 2 === 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#312e2b] text-[#ededed]">
      <header className="border-b border-black/50 bg-[#262421]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none text-[#81b64c]" aria-hidden="true">
              ♞
            </span>
            <span className="text-base font-semibold tracking-tight text-white">
              ML Chess Engine
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#3a3733] px-3 py-1 text-xs font-medium text-[#d9d6d2]">
            <span
              className={`h-2 w-2 rounded-full ${
                readiness === "ready" ? "bg-[#81b64c]" : "bg-[#d9a441]"
              }`}
              aria-hidden="true"
            />
            <span role="status" aria-live="polite">
              {readiness === "ready" ? "Engine online" : "Waking engine..."}
            </span>
            <span
              className="border-l border-white/15 pl-2 text-[#ababaa]"
              title="Engine search depth"
            >
              Depth 1
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,560px)_320px]">
            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="overflow-hidden rounded-md ring-1 ring-black/40 shadow-2xl shadow-black/20">
                <Chessboard options={chessboardOptions} />
              </div>

              {readiness !== "ready" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-[#262421]/85 p-6 text-center backdrop-blur-sm">
                  <div role="status" aria-live="polite" className="max-w-sm">
                    <div
                      className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#81b64c]"
                      aria-hidden="true"
                    />
                    <p className="mt-4 font-medium text-white">
                      Preparing the engine
                    </p>
                    <p className="mt-2 text-sm text-[#ababaa]">
                      {readinessMessage}
                    </p>
                    {readiness === "slow" && (
                      <button
                        type="button"
                        onClick={() =>
                          setHealthCheckVersion((version) => version + 1)
                        }
                        className="mt-4 rounded-md bg-[#81b64c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f9f3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a7c55b]"
                      >
                        Check again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside className="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-lg bg-[#262421] ring-1 ring-black/40 md:h-[560px]">
              <div className="border-b border-black/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-[#ababaa]">
                    Status
                  </span>
                  {isThinking && (
                    <span className="flex items-center gap-1.5 text-xs text-[#ababaa]">
                      <span
                        className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-[#81b64c]"
                        aria-hidden="true"
                      />
                      thinking
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 text-sm font-medium text-white"
                  aria-live="polite"
                >
                  {readiness === "ready" ? message : "Waiting for engine..."}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-[#ababaa]">
                  Moves
                </div>
                <div
                  ref={moveListRef}
                  className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]"
                >
                  {moves.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-[#6f6e6c]">
                      No moves yet.
                    </p>
                  ) : (
                    <ol className="text-sm">
                      {moveRows.map((row, index) => {
                        const isLastRow = index === lastRowIndex;

                        return (
                          <li
                            key={index}
                            className="grid grid-cols-[2rem_1fr_1fr] items-center rounded px-2 py-1 text-[#d9d6d2] transition-colors hover:bg-white/5"
                          >
                            <span className="text-[#6f6e6c]">{index + 1}.</span>
                            <span
                              className={`px-1 font-mono ${
                                isLastRow && lastMoveIsWhite
                                  ? "font-semibold text-[#a7c55b]"
                                  : ""
                              }`}
                            >
                              {row.white}
                            </span>
                            <span
                              className={`px-1 font-mono ${
                                isLastRow && !lastMoveIsWhite
                                  ? "font-semibold text-[#a7c55b]"
                                  : ""
                              }`}
                            >
                              {row.black ?? ""}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>

              <div className="border-t border-black/40 p-3">
                <button
                  type="button"
                  onClick={resetGame}
                  disabled={isThinking || readiness !== "ready"}
                  className="w-full rounded-md bg-[#81b64c] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6f9f3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a7c55b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  New game
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-black/40 bg-[#262421]">
        <div className="mx-auto max-w-5xl px-4 py-3 text-center text-xs text-[#6f6e6c]">
          Built by Conor
        </div>
      </footer>
    </div>
  );
}
