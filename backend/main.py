import os

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Conor Chess Engine API",
    version="0.1.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://chess-engine-rose.vercel.app",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class EngineMoveRequest(BaseModel):
    fen: str


class EngineMoveResponse(BaseModel):
    move: str
    resulting_fen: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def select_move(board: chess.Board) -> chess.Move:
    """
    Temporary placeholder.

    This function is the seam where the custom engine will later be inserted.
    """
    move = next(iter(board.legal_moves), None)

    if move is None:
        raise ValueError("The position contains no legal moves")

    return move


@app.post("/engine-move", response_model=EngineMoveResponse)
def engine_move(payload: EngineMoveRequest) -> EngineMoveResponse:
    try:
        board = chess.Board(payload.fen)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid FEN") from error

    if board.is_game_over():
        raise HTTPException(status_code=400, detail="The game is already over")

    try:
        move = select_move(board)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    board.push(move)

    return EngineMoveResponse(move=move.uci(), resulting_fen=board.fen())
