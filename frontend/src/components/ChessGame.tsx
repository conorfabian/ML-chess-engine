"use client";

import { useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
} from "react-chessboard";

type EngineMoveResponse = {
  move: string;
  resulting_fen: string;
};

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://ml-chess-engine.onrender.com"
    : "http://127.0.0.1:8000";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
  /\/$/,
  "",
);

const STARTING_FEN = new Chess().fen();

export default function ChessGame() {
  const gameRef = useRef(new Chess());

  const [position, setPosition] = useState(STARTING_FEN);
  const [message, setMessage] = useState("Your turn");
  const [isThinking, setIsThinking] = useState(false);

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
    allowDragging: !isThinking,
  };

  return (
    <section className="mt-8 grid gap-6 md:grid-cols-[minmax(0,560px)_1fr]">
      <div className="w-full max-w-[560px]">
        <Chessboard options={chessboardOptions} />
      </div>

      <aside className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">
          Game
        </h2>

        <p
          className="mt-2 text-sm text-zinc-600"
          aria-live="polite"
        >
          {message}
        </p>

        <button
          type="button"
          onClick={resetGame}
          disabled={isThinking}
          className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset game
        </button>
      </aside>
    </section>
  );
}
