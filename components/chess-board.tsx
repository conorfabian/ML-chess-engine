"use client"

import { useState } from "react"
import ChessPiece from "./chess-piece"
import GameInfo from "./game-info"
import {
  initialBoardState,
  getPossibleMoves,
  makeMove,
  computerMove,
  isCheck,
  isCheckmate,
  isStalemate,
  getCapturedPieces,
} from "@/lib/chess-logic"
import type { Square, Piece, Position, GameState, MoveHistory } from "@/lib/types"
import { AnimatePresence, motion } from "framer-motion"

export default function ChessBoard() {
  const [boardState, setBoardState] = useState<Square[][]>(initialBoardState())
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([])
  const [playerTurn, setPlayerTurn] = useState<"white" | "black">("white")
  const [gameStatus, setGameStatus] = useState<GameState>("playing")
  const [moveHistory, setMoveHistory] = useState<MoveHistory[]>([])
  const [capturedPieces, setCapturedPieces] = useState<{ white: Piece[]; black: Piece[] }>({
    white: [],
    black: [],
  })
  const [isPromoting, setIsPromoting] = useState<Position | null>(null)
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null)

  // Handle piece selection
  const handleSquareClick = (row: number, col: number) => {
    if (gameStatus !== "playing" || playerTurn !== "white") return

    // If we're in promotion mode, don't allow other moves
    if (isPromoting) return

    const clickedSquare = boardState[row][col]

    // If a piece is already selected
    if (selectedPiece) {
      // Check if the clicked square is a valid move
      const isValidMove = possibleMoves.some((move) => move.row === row && move.col === col)

      if (isValidMove) {
        // Handle pawn promotion
        const selectedPieceObj = boardState[selectedPiece.row][selectedPiece.col].piece
        if (selectedPieceObj?.type === "pawn" && selectedPieceObj.color === "white" && row === 0) {
          setIsPromoting({ row, col })
          return
        }

        // Make the move
        const newBoardState = makeMove(
          boardState,
          { row: selectedPiece.row, col: selectedPiece.col },
          { row, col },
          moveHistory,
        )

        // Update board state and history
        updateGameAfterMove(newBoardState, {
          piece: selectedPieceObj!,
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col },
        })

        // Set last move for highlighting
        setLastMove({
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col },
        })

        // Reset selection
        setSelectedPiece(null)
        setPossibleMoves([])

        // Computer's turn
        setTimeout(() => {
          if (gameStatus === "playing") {
            makeComputerMove()
          }
        }, 500)
      } else if (clickedSquare.piece && clickedSquare.piece.color === "white") {
        // Select a different piece
        setSelectedPiece({ row, col })
        setPossibleMoves(getPossibleMoves(boardState, row, col, moveHistory))
      } else {
        // Clicked an invalid square, deselect
        setSelectedPiece(null)
        setPossibleMoves([])
      }
    } else {
      // No piece selected yet
      if (clickedSquare.piece && clickedSquare.piece.color === "white") {
        setSelectedPiece({ row, col })
        setPossibleMoves(getPossibleMoves(boardState, row, col, moveHistory))
      }
    }
  }

  // Handle pawn promotion
  const handlePromotion = (pieceType: "queen" | "rook" | "bishop" | "knight") => {
    if (!isPromoting || !selectedPiece) return

    const newBoardState = [...boardState]
    const selectedPieceObj = boardState[selectedPiece.row][selectedPiece.col].piece

    // Create the new piece
    newBoardState[isPromoting.row][isPromoting.col] = {
      ...newBoardState[isPromoting.row][isPromoting.col],
      piece: {
        type: pieceType,
        color: "white",
        hasMoved: true,
      },
    }

    // Remove the original pawn
    newBoardState[selectedPiece.row][selectedPiece.col] = {
      ...newBoardState[selectedPiece.row][selectedPiece.col],
      piece: null,
    }

    // Update game state
    updateGameAfterMove(newBoardState, {
      piece: selectedPieceObj!,
      from: { row: selectedPiece.row, col: selectedPiece.col },
      to: isPromoting,
      promotion: pieceType,
    })

    // Set last move for highlighting
    setLastMove({
      from: { row: selectedPiece.row, col: selectedPiece.col },
      to: isPromoting,
    })

    // Reset promotion state
    setIsPromoting(null)
    setSelectedPiece(null)
    setPossibleMoves([])

    // Computer's turn
    setTimeout(() => {
      if (gameStatus === "playing") {
        makeComputerMove()
      }
    }, 500)
  }

  // Make computer move
  const makeComputerMove = () => {
    // Set player turn to black to prevent player from moving during computer's "thinking"
    setPlayerTurn("black")

    // Small delay to simulate computer thinking
    setTimeout(() => {
      // Use functional updates to ensure we have the latest state
      setBoardState((currentBoardState) => {
        const currentMoveHistory = [...moveHistory]
        const { newBoard, move } = computerMove(currentBoardState, currentMoveHistory)

        if (move) {
          // Update move history
          const updatedHistory = [...currentMoveHistory, move]
          setMoveHistory(updatedHistory)

          // Update captured pieces
          setCapturedPieces(getCapturedPieces(newBoard, updatedHistory))

          // Set last move for highlighting
          setLastMove({
            from: move.from,
            to: move.to,
          })

          // Check game state
          if (isCheckmate(newBoard, "white", updatedHistory)) {
            setGameStatus("blackWin")
          } else if (isStalemate(newBoard, "white", updatedHistory)) {
            setGameStatus("stalemate")
          } else if (isCheck(newBoard, "white", updatedHistory)) {
            setGameStatus("check")
          } else {
            setGameStatus("playing")
          }

          // Important: Switch turn back to white (player)
          setPlayerTurn("white")

          return newBoard
        }
        return currentBoardState
      })
    }, 500)
  }

  // Update game state after a player move
  const updateGameAfterMove = (newBoard: Square[][], move: MoveHistory) => {
    setBoardState(newBoard)

    // Update move history
    const updatedHistory = [...moveHistory, move]
    setMoveHistory(updatedHistory)

    // Update captured pieces
    setCapturedPieces(getCapturedPieces(newBoard, updatedHistory))

    // Switch turns - this will be handled differently for computer moves
    setPlayerTurn("black")

    // Check game state
    if (isCheckmate(newBoard, "black", updatedHistory)) {
      setGameStatus("whiteWin")
    } else if (isStalemate(newBoard, "black", updatedHistory)) {
      setGameStatus("stalemate")
    } else if (isCheck(newBoard, "black", updatedHistory)) {
      setGameStatus("check")
    } else {
      setGameStatus("playing")
    }
  }

  // Reset the game
  const resetGame = () => {
    setBoardState(initialBoardState())
    setSelectedPiece(null)
    setPossibleMoves([])
    setPlayerTurn("white")
    setGameStatus("playing")
    setMoveHistory([])
    setCapturedPieces({ white: [], black: [] })
    setIsPromoting(null)
    setLastMove(null)
  }

  // Render the chess board
  return (
    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
      <div className="relative">
        <motion.div
          className="grid grid-cols-8 rounded-xl overflow-hidden shadow-2xl bg-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {boardState.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex
              const isValidMove = possibleMoves.some((move) => move.row === rowIndex && move.col === colIndex)
              const isLastMoveFrom = lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex
              const isLastMoveTo = lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex

              // Check if king is in check
              const isKingInCheck =
                square.piece?.type === "king" &&
                ((square.piece.color === "white" && gameStatus === "check" && playerTurn === "white") ||
                  (square.piece.color === "black" && gameStatus === "check" && playerTurn === "black"))

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center relative
                    ${(rowIndex + colIndex) % 2 === 0 ? "bg-zinc-700" : "bg-zinc-900"}
                    ${isSelected ? "ring-2 ring-blue-400 ring-inset" : ""}
                    ${isValidMove ? "cursor-pointer" : ""}
                    ${isLastMoveFrom || isLastMoveTo ? "bg-opacity-80" : ""}
                    ${isKingInCheck ? "bg-red-900 bg-opacity-50" : ""}
                    transition-colors duration-200
                  `}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  whileHover={isValidMove ? { scale: 1.05 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {square.piece && (
                    <motion.div
                      initial={isLastMoveTo ? { scale: 0.8, opacity: 0 } : { scale: 1 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <ChessPiece piece={square.piece} />
                    </motion.div>
                  )}

                  {isValidMove && !square.piece && (
                    <motion.div
                      className="w-3 h-3 rounded-full bg-blue-400 opacity-60"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}

                  {isValidMove && square.piece && (
                    <motion.div
                      className="absolute inset-0 ring-2 ring-blue-400 ring-inset"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}

                  {/* File and rank labels */}
                  {colIndex === 0 && (
                    <span className="absolute left-1 top-0 text-xs font-semibold text-zinc-400">{8 - rowIndex}</span>
                  )}
                  {rowIndex === 7 && (
                    <span className="absolute right-1 bottom-0 text-xs font-semibold text-zinc-400">
                      {String.fromCharCode(97 + colIndex)}
                    </span>
                  )}
                </motion.div>
              )
            }),
          )}
        </motion.div>

        {/* Pawn promotion dialog */}
        <AnimatePresence>
          {isPromoting && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-800 p-3 rounded-lg shadow-2xl border border-zinc-700 z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="grid grid-cols-4 gap-2">
                <motion.button
                  onClick={() => handlePromotion("queen")}
                  className="w-12 h-12 flex items-center justify-center hover:bg-zinc-700 rounded-md transition-colors"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChessPiece piece={{ type: "queen", color: "white", hasMoved: true }} />
                </motion.button>
                <motion.button
                  onClick={() => handlePromotion("rook")}
                  className="w-12 h-12 flex items-center justify-center hover:bg-zinc-700 rounded-md transition-colors"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChessPiece piece={{ type: "rook", color: "white", hasMoved: true }} />
                </motion.button>
                <motion.button
                  onClick={() => handlePromotion("bishop")}
                  className="w-12 h-12 flex items-center justify-center hover:bg-zinc-700 rounded-md transition-colors"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChessPiece piece={{ type: "bishop", color: "white", hasMoved: true }} />
                </motion.button>
                <motion.button
                  onClick={() => handlePromotion("knight")}
                  className="w-12 h-12 flex items-center justify-center hover:bg-zinc-700 rounded-md transition-colors"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChessPiece piece={{ type: "knight", color: "white", hasMoved: true }} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GameInfo
        gameStatus={gameStatus}
        capturedPieces={capturedPieces}
        playerTurn={playerTurn}
        moveHistory={moveHistory}
        resetGame={resetGame}
      />
    </div>
  )
}
