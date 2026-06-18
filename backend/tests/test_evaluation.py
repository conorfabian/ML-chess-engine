import unittest

import chess
import torch

from engine.evaluation import CHECKMATE_SCORE, encode_board, evaluation
from engine.search import search


class EvaluationTests(unittest.TestCase):
    def test_starting_position_encoding_matches_training_schema(self) -> None:
        encoded = encode_board(chess.Board())

        self.assertEqual(encoded.shape, (18, 8, 8))
        self.assertEqual(encoded.dtype, torch.float32)
        self.assertEqual(encoded[:12].sum().item(), 32.0)
        self.assertTrue(torch.all(encoded[12] == 1.0))
        self.assertTrue(torch.all(encoded[13:17] == 1.0))
        self.assertEqual(encoded[17].sum().item(), 0.0)

    def test_terminal_scores_override_model_inference(self) -> None:
        checkmate = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
        stalemate = chess.Board("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")

        self.assertEqual(evaluation(checkmate), CHECKMATE_SCORE)
        self.assertEqual(evaluation(stalemate), 0.0)

    def test_model_inference_is_deterministic_and_white_relative(self) -> None:
        starting_board = chess.Board()
        first_score = evaluation(starting_board)
        second_score = evaluation(starting_board)

        white_advantage = chess.Board(
            "8/3B4/8/p4p1k/5P1p/Pb6/1P4P1/6K1 w - - 0 1"
        )
        black_advantage = chess.Board(
            "1q2r2k/3n1Qbp/4p1p1/3bN3/1p4P1/1P5P/rB4BK/2RR4 w - - 0 1"
        )

        self.assertEqual(first_score, second_score)
        self.assertGreater(first_score, -0.2)
        self.assertLess(first_score, 0.2)
        self.assertGreater(evaluation(white_advantage), 0.0)
        self.assertLess(evaluation(black_advantage), 0.0)

    def test_search_returns_a_legal_move_with_model_evaluation(self) -> None:
        board = chess.Board()
        move = search(board, depth=1)

        self.assertIn(move, board.legal_moves)


if __name__ == "__main__":
    unittest.main()
