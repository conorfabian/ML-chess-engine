from pathlib import Path

import chess
import torch
from torch import nn


CHECKMATE_SCORE = 100_000.0
MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "chess_evaluator_v1.pt"
EXPECTED_INPUT_CHANNELS = 18
EXPECTED_PERSPECTIVE = "white"


class ChessEvaluator(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(EXPECTED_INPUT_CHANNELS, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
        )
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 8 * 8, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, 1),
        )

    def forward(self, positions: torch.Tensor) -> torch.Tensor:
        return self.head(self.features(positions)).squeeze(1)


def encode_board(board: chess.Board) -> torch.Tensor:
    encoded = torch.zeros((EXPECTED_INPUT_CHANNELS, 8, 8), dtype=torch.float32)

    for square, piece in board.piece_map().items():
        color_offset = 0 if piece.color == chess.WHITE else 6
        channel = color_offset + piece.piece_type - 1
        row = 7 - chess.square_rank(square)
        column = chess.square_file(square)
        encoded[channel, row, column] = 1.0

    encoded[12].fill_(float(board.turn == chess.WHITE))
    encoded[13].fill_(float(board.has_kingside_castling_rights(chess.WHITE)))
    encoded[14].fill_(float(board.has_queenside_castling_rights(chess.WHITE)))
    encoded[15].fill_(float(board.has_kingside_castling_rights(chess.BLACK)))
    encoded[16].fill_(float(board.has_queenside_castling_rights(chess.BLACK)))

    if board.ep_square is not None:
        row = 7 - chess.square_rank(board.ep_square)
        column = chess.square_file(board.ep_square)
        encoded[17, row, column] = 1.0

    return encoded


def _load_model() -> ChessEvaluator:
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Chess evaluator artifact is missing: {MODEL_PATH}")

    artifact = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    if artifact.get("input_channels") != EXPECTED_INPUT_CHANNELS:
        raise RuntimeError("Chess evaluator artifact uses an incompatible input schema")
    if artifact.get("perspective") != EXPECTED_PERSPECTIVE:
        raise RuntimeError("Chess evaluator artifact uses an incompatible score perspective")

    model = ChessEvaluator()
    model.load_state_dict(artifact["model_state_dict"])
    model.eval()
    return model


MODEL = _load_model()


def evaluation(board: chess.Board) -> float:
    """Evaluate a position from White's perspective."""
    if board.is_checkmate():
        return -CHECKMATE_SCORE if board.turn == chess.WHITE else CHECKMATE_SCORE

    if board.is_stalemate() or board.is_insufficient_material():
        return 0.0

    encoded = encode_board(board).unsqueeze(0)
    with torch.inference_mode():
        score = MODEL(encoded).clamp(-1.0, 1.0).item()

    return float(score)
