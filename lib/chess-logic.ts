import type { Square, Piece, Position, MoveHistory, ComputerMoveResult } from "./types"

// Initialize the chess board with pieces in their starting positions
export function initialBoardState(): Square[][] {
  const board: Square[][] = Array(8)
    .fill(null)
    .map(() =>
      Array(8)
        .fill(null)
        .map(() => ({ piece: null })),
    )

  // Set up pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { piece: { type: "pawn", color: "black", hasMoved: false } }
    board[6][col] = { piece: { type: "pawn", color: "white", hasMoved: false } }
  }

  // Set up rooks
  board[0][0] = { piece: { type: "rook", color: "black", hasMoved: false } }
  board[0][7] = { piece: { type: "rook", color: "black", hasMoved: false } }
  board[7][0] = { piece: { type: "rook", color: "white", hasMoved: false } }
  board[7][7] = { piece: { type: "rook", color: "white", hasMoved: false } }

  // Set up knights
  board[0][1] = { piece: { type: "knight", color: "black", hasMoved: false } }
  board[0][6] = { piece: { type: "knight", color: "black", hasMoved: false } }
  board[7][1] = { piece: { type: "knight", color: "white", hasMoved: false } }
  board[7][6] = { piece: { type: "knight", color: "white", hasMoved: false } }

  // Set up bishops
  board[0][2] = { piece: { type: "bishop", color: "black", hasMoved: false } }
  board[0][5] = { piece: { type: "bishop", color: "black", hasMoved: false } }
  board[7][2] = { piece: { type: "bishop", color: "white", hasMoved: false } }
  board[7][5] = { piece: { type: "bishop", color: "white", hasMoved: false } }

  // Set up queens
  board[0][3] = { piece: { type: "queen", color: "black", hasMoved: false } }
  board[7][3] = { piece: { type: "queen", color: "white", hasMoved: false } }

  // Set up kings
  board[0][4] = { piece: { type: "king", color: "black", hasMoved: false } }
  board[7][4] = { piece: { type: "king", color: "white", hasMoved: false } }

  return board
}

// Get the piece at a specific position
export function getPieceAtPosition(board: Square[][], position: Position): Piece | null {
  if (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8) {
    return null
  }

  return board[position.row][position.col].piece
}

// Get all possible moves for a piece
export function getPossibleMoves(board: Square[][], row: number, col: number, moveHistory: MoveHistory[]): Position[] {
  const piece = board[row][col].piece
  if (!piece) return []

  let moves: Position[] = []

  switch (piece.type) {
    case "pawn":
      moves = getPawnMoves(board, row, col, moveHistory)
      break
    case "rook":
      moves = getRookMoves(board, row, col)
      break
    case "knight":
      moves = getKnightMoves(board, row, col)
      break
    case "bishop":
      moves = getBishopMoves(board, row, col)
      break
    case "queen":
      moves = getQueenMoves(board, row, col)
      break
    case "king":
      moves = getKingMoves(board, row, col, moveHistory)
      break
  }

  // Filter out moves that would put the king in check
  return moves.filter((move) => {
    const newBoard = makeMove(
      board,
      { row, col },
      move,
      moveHistory,
      true, // This is a test move, don't update piece.hasMoved
    )
    return !isKingInCheck(newBoard, piece.color, moveHistory)
  })
}

// Get pawn moves
function getPawnMoves(board: Square[][], row: number, col: number, moveHistory: MoveHistory[]): Position[] {
  const piece = board[row][col].piece
  if (!piece || piece.type !== "pawn") return []

  const moves: Position[] = []
  const direction = piece.color === "white" ? -1 : 1

  // Forward move
  if (row + direction >= 0 && row + direction < 8 && !board[row + direction][col].piece) {
    moves.push({ row: row + direction, col })

    // Double move from starting position
    if (
      ((piece.color === "white" && row === 6) || (piece.color === "black" && row === 1)) &&
      !board[row + 2 * direction][col].piece
    ) {
      moves.push({ row: row + 2 * direction, col })
    }
  }

  // Capture moves
  for (const colOffset of [-1, 1]) {
    if (col + colOffset >= 0 && col + colOffset < 8 && row + direction >= 0 && row + direction < 8) {
      const targetPiece = board[row + direction][col + colOffset].piece

      // Regular capture
      if (targetPiece && targetPiece.color !== piece.color) {
        moves.push({ row: row + direction, col: col + colOffset })
      }

      // En passant
      if (!targetPiece && canEnPassant(board, row, col, colOffset, moveHistory)) {
        moves.push({ row: row + direction, col: col + colOffset })
      }
    }
  }

  return moves
}

// Check if en passant is possible
function canEnPassant(
  board: Square[][],
  row: number,
  col: number,
  colOffset: number,
  moveHistory: MoveHistory[],
): boolean {
  if (moveHistory.length === 0) return false

  const piece = board[row][col].piece
  if (!piece || piece.type !== "pawn") return false

  const lastMove = moveHistory[moveHistory.length - 1]
  const targetCol = col + colOffset

  // Check if the last move was a pawn moving two squares
  return (
    lastMove.piece.type === "pawn" &&
    lastMove.piece.color !== piece.color &&
    lastMove.from.col === targetCol &&
    lastMove.to.col === targetCol &&
    lastMove.to.row === row &&
    Math.abs(lastMove.from.row - lastMove.to.row) === 2
  )
}

// Get rook moves
function getRookMoves(board: Square[][], row: number, col: number): Position[] {
  const piece = board[row][col].piece
  if (!piece) return []

  const moves: Position[] = []
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 }, // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }, // right
  ]

  for (const direction of directions) {
    let newRow = row + direction.row
    let newCol = col + direction.col

    while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const targetPiece = board[newRow][newCol].piece

      if (!targetPiece) {
        // Empty square
        moves.push({ row: newRow, col: newCol })
      } else if (targetPiece.color !== piece.color) {
        // Capture opponent's piece
        moves.push({ row: newRow, col: newCol })
        break
      } else {
        // Own piece
        break
      }

      newRow += direction.row
      newCol += direction.col
    }
  }

  return moves
}

// Get knight moves
function getKnightMoves(board: Square[][], row: number, col: number): Position[] {
  const piece = board[row][col].piece
  if (!piece) return []

  const moves: Position[] = []
  const knightMoves = [
    { row: -2, col: -1 },
    { row: -2, col: 1 },
    { row: -1, col: -2 },
    { row: -1, col: 2 },
    { row: 1, col: -2 },
    { row: 1, col: 2 },
    { row: 2, col: -1 },
    { row: 2, col: 1 },
  ]

  for (const move of knightMoves) {
    const newRow = row + move.row
    const newCol = col + move.col

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const targetPiece = board[newRow][newCol].piece

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }

  return moves
}

// Get bishop moves
function getBishopMoves(board: Square[][], row: number, col: number): Position[] {
  const piece = board[row][col].piece
  if (!piece) return []

  const moves: Position[] = []
  const directions = [
    { row: -1, col: -1 }, // up-left
    { row: -1, col: 1 }, // up-right
    { row: 1, col: -1 }, // down-left
    { row: 1, col: 1 }, // down-right
  ]

  for (const direction of directions) {
    let newRow = row + direction.row
    let newCol = col + direction.col

    while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const targetPiece = board[newRow][newCol].piece

      if (!targetPiece) {
        // Empty square
        moves.push({ row: newRow, col: newCol })
      } else if (targetPiece.color !== piece.color) {
        // Capture opponent's piece
        moves.push({ row: newRow, col: newCol })
        break
      } else {
        // Own piece
        break
      }

      newRow += direction.row
      newCol += direction.col
    }
  }

  return moves
}

// Get queen moves (combination of rook and bishop moves)
function getQueenMoves(board: Square[][], row: number, col: number): Position[] {
  return [...getRookMoves(board, row, col), ...getBishopMoves(board, row, col)]
}

// Get king moves
function getKingMoves(board: Square[][], row: number, col: number, moveHistory: MoveHistory[]): Position[] {
  const piece = board[row][col].piece
  if (!piece || piece.type !== "king") return []

  const moves: Position[] = []
  const kingMoves = [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ]

  // Regular king moves
  for (const move of kingMoves) {
    const newRow = row + move.row
    const newCol = col + move.col

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      const targetPiece = board[newRow][newCol].piece

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }

  // Castling
  if (!piece.hasMoved && !isKingInCheck(board, piece.color, moveHistory)) {
    // Kingside castling
    if (canCastle(board, row, col, "kingside", moveHistory)) {
      moves.push({ row, col: col + 2 })
    }

    // Queenside castling
    if (canCastle(board, row, col, "queenside", moveHistory)) {
      moves.push({ row, col: col - 2 })
    }
  }

  return moves
}

// Check if castling is possible
function canCastle(
  board: Square[][],
  row: number,
  col: number,
  side: "kingside" | "queenside",
  moveHistory: MoveHistory[],
): boolean {
  const piece = board[row][col].piece
  if (!piece || piece.type !== "king" || piece.hasMoved) return false

  const rookCol = side === "kingside" ? 7 : 0
  const rookPiece = board[row][rookCol].piece

  if (!rookPiece || rookPiece.type !== "rook" || rookPiece.color !== piece.color || rookPiece.hasMoved) {
    return false
  }

  // Check if squares between king and rook are empty
  const direction = side === "kingside" ? 1 : -1
  const endCol = side === "kingside" ? 6 : 2

  for (let c = col + direction; side === "kingside" ? c <= endCol : c >= endCol; c += direction) {
    if (board[row][c].piece) {
      return false
    }
  }

  // Check if king passes through check
  for (let c = col; side === "kingside" ? c <= col + 2 : c >= col - 2; c += direction) {
    if (c === col) continue // Skip the current king position

    const testBoard = JSON.parse(JSON.stringify(board))
    testBoard[row][col].piece = null
    testBoard[row][c].piece = { ...piece }

    if (isKingInCheck(testBoard, piece.color, moveHistory)) {
      return false
    }
  }

  return true
}

// Make a move on the board
export function makeMove(
  board: Square[][],
  from: Position,
  to: Position,
  moveHistory: MoveHistory[],
  isTestMove = false,
): Square[][] {
  const newBoard = JSON.parse(JSON.stringify(board))
  const piece = newBoard[from.row][from.col].piece

  if (!piece) return newBoard

  // Store the captured piece if any
  const capturedPiece = newBoard[to.row][to.col].piece

  // Handle special moves
  let castling: "kingside" | "queenside" | undefined
  let enPassant = false

  // Castling
  if (piece.type === "king" && Math.abs(from.col - to.col) === 2) {
    const isKingside = to.col > from.col
    castling = isKingside ? "kingside" : "queenside"

    const rookFromCol = isKingside ? 7 : 0
    const rookToCol = isKingside ? 5 : 3

    // Move the rook
    newBoard[from.row][rookToCol].piece = newBoard[from.row][rookFromCol].piece
    if (!isTestMove && newBoard[from.row][rookToCol].piece) {
      newBoard[from.row][rookToCol].piece.hasMoved = true
    }
    newBoard[from.row][rookFromCol].piece = null
  }

  // En passant
  if (piece.type === "pawn" && from.col !== to.col && !capturedPiece) {
    // This is a diagonal pawn move without a capture, must be en passant
    const captureRow = from.row
    const captureCol = to.col

    // Capture the pawn that was passed
    newBoard[captureRow][captureCol].piece = null
    enPassant = true
  }

  // Move the piece
  newBoard[to.row][to.col].piece = piece
  newBoard[from.row][from.col].piece = null

  // Update piece state
  if (!isTestMove && newBoard[to.row][to.col].piece) {
    newBoard[to.row][to.col].piece.hasMoved = true
  }

  // Add to move history if not a test move
  if (!isTestMove) {
    moveHistory.push({
      piece,
      from,
      to,
      captured: capturedPiece || undefined,
      castling,
      enPassant: enPassant || undefined,
    })
  }

  return newBoard
}

// Check if the king is in check
export function isKingInCheck(board: Square[][], kingColor: "white" | "black", moveHistory: MoveHistory[]): boolean {
  // Find the king
  let kingPosition: Position | null = null

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece
      if (piece && piece.type === "king" && piece.color === kingColor) {
        kingPosition = { row, col }
        break
      }
    }
    if (kingPosition) break
  }

  if (!kingPosition) return false // King not found (shouldn't happen in a valid game)

  // Check if any opponent piece can capture the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece

      if (piece && piece.color !== kingColor) {
        let moves: Position[] = []

        // Get all possible moves for this piece
        // We need to use a different function to avoid infinite recursion
        switch (piece.type) {
          case "pawn":
            moves = getPawnAttackMoves(board, row, col)
            break
          case "rook":
            moves = getRookMoves(board, row, col)
            break
          case "knight":
            moves = getKnightMoves(board, row, col)
            break
          case "bishop":
            moves = getBishopMoves(board, row, col)
            break
          case "queen":
            moves = getQueenMoves(board, row, col)
            break
          case "king":
            moves = getKingBasicMoves(board, row, col)
            break
        }

        // Check if any move can capture the king
        for (const move of moves) {
          if (move.row === kingPosition.row && move.col === kingPosition.col) {
            return true
          }
        }
      }
    }
  }

  return false
}

// Get pawn attack moves (for check detection)
function getPawnAttackMoves(board: Square[][], row: number, col: number): Position[] {
  const piece = board[row][col].piece
  if (!piece || piece.type !== "pawn") return []

  const moves: Position[] = []
  const direction = piece.color === "white" ? -1 : 1

  // Diagonal captures
  for (const colOffset of [-1, 1]) {
    if (col + colOffset >= 0 && col + colOffset < 8 && row + direction >= 0 && row + direction < 8) {
      moves.push({ row: row + direction, col: col + colOffset })
    }
  }

  return moves
}

// Get basic king moves (for check detection)
function getKingBasicMoves(board: Square[][], row: number, col: number): Position[] {
  const piece = board[row][col].piece
  if (!piece) return []

  const moves: Position[] = []
  const kingMoves = [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ]

  for (const move of kingMoves) {
    const newRow = row + move.row
    const newCol = col + move.col

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      moves.push({ row: newRow, col: newCol })
    }
  }

  return moves
}

// Check if the king is in checkmate
export function isCheckmate(board: Square[][], kingColor: "white" | "black", moveHistory: MoveHistory[]): boolean {
  // If the king is not in check, it's not checkmate
  if (!isCheck(board, kingColor, moveHistory)) {
    return false
  }

  // Check if any move can get the king out of check
  return !hasLegalMoves(board, kingColor, moveHistory)
}

// Check if the position is a stalemate
export function isStalemate(board: Square[][], kingColor: "white" | "black", moveHistory: MoveHistory[]): boolean {
  // If the king is in check, it's not stalemate
  if (isCheck(board, kingColor, moveHistory)) {
    return false
  }

  // If the player has no legal moves, it's stalemate
  return !hasLegalMoves(board, kingColor, moveHistory)
}

// Check if the player has any legal moves
function hasLegalMoves(board: Square[][], playerColor: "white" | "black", moveHistory: MoveHistory[]): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col].piece

      if (piece && piece.color === playerColor) {
        const moves = getPossibleMoves(board, row, col, moveHistory)

        if (moves.length > 0) {
          return true
        }
      }
    }
  }

  return false
}

// Check if the king is in check
export function isCheck(board: Square[][], kingColor: "white" | "black", moveHistory: MoveHistory[]): boolean {
  return isKingInCheck(board, kingColor, moveHistory)
}

// Get all captured pieces
export function getCapturedPieces(board: Square[][], moveHistory: MoveHistory[]): { white: Piece[]; black: Piece[] } {
  const captured = {
    white: [] as Piece[],
    black: [] as Piece[],
  }

  for (const move of moveHistory) {
    if (move.captured) {
      if (move.captured.color === "white") {
        captured.white.push(move.captured)
      } else {
        captured.black.push(move.captured)
      }
    }
  }

  return captured
}

// Computer makes a move
export function computerMove(board: Square[][], moveHistory: MoveHistory[]): ComputerMoveResult {
  // Create a deep copy of the board to avoid mutation issues
  const boardCopy = JSON.parse(JSON.stringify(board))

  // Find all possible moves for black pieces
  const possibleMoves: { from: Position; to: Position; piece: Piece }[] = []

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardCopy[row][col].piece

      if (piece && piece.color === "black") {
        const moves = getPossibleMoves(boardCopy, row, col, moveHistory)

        for (const move of moves) {
          possibleMoves.push({
            from: { row, col },
            to: move,
            piece,
          })
        }
      }
    }
  }

  if (possibleMoves.length === 0) {
    return { newBoard: boardCopy, move: null }
  }

  // Evaluate moves and choose the best one
  const scoredMoves = possibleMoves.map((move) => {
    const testMoveHistory = [...moveHistory]
    const newBoard = makeMove(boardCopy, move.from, move.to, testMoveHistory, true)

    const score = evaluateMove(newBoard, move, testMoveHistory)
    return { ...move, score }
  })

  // Sort moves by score (highest first)
  scoredMoves.sort((a, b) => b.score - a.score)

  // Choose a move with some randomness to make the computer less predictable
  // Prefer higher-scored moves but occasionally choose a suboptimal move
  const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length))
  const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)]

  // Make the actual move on a fresh copy of the board
  const historyForActualMove = [...moveHistory]
  const newBoard = makeMove(boardCopy, selectedMove.from, selectedMove.to, historyForActualMove)

  // Handle pawn promotion
  let promotion: "queen" | "rook" | "bishop" | "knight" | undefined
  if (selectedMove.piece.type === "pawn" && selectedMove.to.row === 7) {
    // Always promote to queen for simplicity
    promotion = "queen"
    newBoard[selectedMove.to.row][selectedMove.to.col].piece = {
      type: "queen",
      color: "black",
      hasMoved: true,
    }

    // Update the move history
    historyForActualMove[historyForActualMove.length - 1].promotion = promotion
  }

  return {
    newBoard,
    move: {
      ...historyForActualMove[historyForActualMove.length - 1],
      promotion,
    },
  }
}

// Evaluate a move for the computer AI
function evaluateMove(
  board: Square[][],
  move: { from: Position; to: Position; piece: Piece },
  moveHistory: MoveHistory[],
): number {
  let score = 0

  // Piece values
  const pieceValues = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0, // King has no capture value since it can't be captured
  }

  // Capture value
  const capturedPiece = board[move.to.row][move.to.col].piece
  if (capturedPiece) {
    score += pieceValues[capturedPiece.type] * 10
  }

  // Check value
  if (isCheck(board, "white", moveHistory)) {
    score += 5
  }

  // Checkmate value
  if (isCheckmate(board, "white", moveHistory)) {
    score += 1000
  }

  // Position value
  // Center control
  if (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5) {
    score += 1
  }

  // Pawn advancement
  if (move.piece.type === "pawn") {
    score += move.to.row * 0.1 // Encourage pawns to advance
  }

  // Development value (knights and bishops)
  if ((move.piece.type === "knight" || move.piece.type === "bishop") && move.from.row === 0) {
    score += 2 // Encourage development of minor pieces
  }

  // Avoid moving the king early (except for castling)
  if (move.piece.type === "king" && !move.piece.hasMoved && Math.abs(move.from.col - move.to.col) !== 2) {
    score -= 3
  }

  // Encourage castling
  if (move.piece.type === "king" && !move.piece.hasMoved && Math.abs(move.from.col - move.to.col) === 2) {
    score += 5
  }

  return score
}
