"use client"

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { GameState, MoveHistory, Piece } from "@/lib/types"
import { RefreshCw, Clock, Trophy, AlertTriangle } from "lucide-react"

interface GameInfoProps {
  gameStatus: GameState
  capturedPieces: { white: Piece[]; black: Piece[] }
  playerTurn: "white" | "black"
  moveHistory: MoveHistory[]
  resetGame: () => void
}

export default function GameInfo({ gameStatus, capturedPieces, playerTurn, moveHistory, resetGame }: GameInfoProps) {
  const getStatusMessage = () => {
    switch (gameStatus) {
      case "playing":
        return playerTurn === "white" ? "Your turn" : "Computer is thinking..."
      case "check":
        return playerTurn === "white" ? "You are in check!" : "Computer is in check!"
      case "whiteWin":
        return "Checkmate! You win!"
      case "blackWin":
        return "Checkmate! Computer wins!"
      case "stalemate":
        return "Stalemate! The game is a draw."
      default:
        return ""
    }
  }

  const getStatusIcon = () => {
    switch (gameStatus) {
      case "playing":
        return <Clock className="h-5 w-5" />
      case "check":
        return <AlertTriangle className="h-5 w-5" />
      case "whiteWin":
      case "blackWin":
        return <Trophy className="h-5 w-5" />
      case "stalemate":
        return <AlertTriangle className="h-5 w-5" />
      default:
        return null
    }
  }

  const getPieceSymbol = (piece: Piece) => {
    switch (piece.type) {
      case "pawn":
        return piece.color === "white" ? "♙" : "♟"
      case "rook":
        return piece.color === "white" ? "♖" : "♜"
      case "knight":
        return piece.color === "white" ? "♘" : "♞"
      case "bishop":
        return piece.color === "white" ? "♗" : "♝"
      case "queen":
        return piece.color === "white" ? "♕" : "♛"
      case "king":
        return piece.color === "white" ? "♔" : "♚"
      default:
        return ""
    }
  }

  const getNotation = (move: MoveHistory) => {
    const pieceSymbols: Record<string, string> = {
      pawn: "",
      knight: "N",
      bishop: "B",
      rook: "R",
      queen: "Q",
      king: "K",
    }

    const files = "abcdefgh"
    const ranks = "87654321"

    const from = `${files[move.from.col]}${ranks[move.from.row]}`
    const to = `${files[move.to.col]}${ranks[move.to.row]}`

    let notation = pieceSymbols[move.piece.type]

    // Add the move
    notation += from + to

    // Add promotion if applicable
    if (move.promotion) {
      notation += "=" + pieceSymbols[move.promotion].toUpperCase()
    }

    return notation
  }

  return (
    <motion.div
      className="w-full md:w-72 bg-zinc-800 p-5 rounded-xl shadow-xl border border-zinc-700"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-white">Game Info</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={resetGame}
          className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <motion.div
        className="mb-5 bg-zinc-700 p-3 rounded-lg"
        animate={{
          backgroundColor:
            gameStatus === "whiteWin"
              ? "rgba(34, 197, 94, 0.2)"
              : gameStatus === "blackWin"
                ? "rgba(239, 68, 68, 0.2)"
                : gameStatus === "stalemate"
                  ? "rgba(245, 158, 11, 0.2)"
                  : gameStatus === "check"
                    ? "rgba(249, 115, 22, 0.2)"
                    : "rgba(63, 63, 70, 0.5)",
        }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={`flex items-center gap-2 text-lg font-medium ${
            gameStatus === "whiteWin"
              ? "text-green-400"
              : gameStatus === "blackWin"
                ? "text-red-400"
                : gameStatus === "stalemate"
                  ? "text-amber-400"
                  : gameStatus === "check"
                    ? "text-orange-400"
                    : "text-white"
          }`}
        >
          {getStatusIcon()}
          {getStatusMessage()}
        </div>
      </motion.div>

      <div className="mb-5 bg-zinc-700/50 p-3 rounded-lg">
        <h3 className="font-medium mb-2 text-zinc-300">Captured Pieces</h3>
        <div className="flex flex-wrap gap-1 mb-3">
          <span className="font-medium text-sm text-zinc-400">White: </span>
          {capturedPieces.white.length === 0 ? (
            <span className="text-zinc-500 text-sm">None</span>
          ) : (
            capturedPieces.white.map((piece, index) => (
              <motion.span
                key={index}
                className="text-xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {getPieceSymbol(piece)}
              </motion.span>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="font-medium text-sm text-zinc-400">Black: </span>
          {capturedPieces.black.length === 0 ? (
            <span className="text-zinc-500 text-sm">None</span>
          ) : (
            capturedPieces.black.map((piece, index) => (
              <motion.span
                key={index}
                className="text-xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {getPieceSymbol(piece)}
              </motion.span>
            ))
          )}
        </div>
      </div>

      <div className="bg-zinc-700/50 p-3 rounded-lg">
        <h3 className="font-medium mb-2 text-zinc-300">Move History</h3>
        <div className="max-h-48 overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800 pr-2">
          {moveHistory.length === 0 ? (
            <span className="text-zinc-500">No moves yet</span>
          ) : (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">{i + 1}.</span>
                    <span className="text-zinc-200">{moveHistory[i * 2] ? getNotation(moveHistory[i * 2]) : ""}</span>
                  </div>
                  <div className="text-zinc-200">
                    {moveHistory[i * 2 + 1] ? getNotation(moveHistory[i * 2 + 1]) : ""}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
