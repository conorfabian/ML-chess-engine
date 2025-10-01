export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king"
export type PieceColor = "white" | "black"

export interface Piece {
  type: PieceType
  color: PieceColor
  hasMoved?: boolean
}

export interface Square {
  piece: Piece | null
}

export interface Position {
  row: number
  col: number
}

export type GameState = "playing" | "check" | "whiteWin" | "blackWin" | "stalemate"

export interface MoveHistory {
  piece: Piece
  from: Position
  to: Position
  captured?: Piece
  promotion?: PieceType
  castling?: "kingside" | "queenside"
  enPassant?: boolean
}

export interface ComputerMoveResult {
  newBoard: Square[][]
  move: MoveHistory | null
}
