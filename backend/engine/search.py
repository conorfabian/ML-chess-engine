import chess

from engine.evaluation import evaluation


def negmax(board: chess.Board, depth: int, alpha: int | float, beta: int | float) -> int | float:
    if depth <= 0 or board.is_game_over():
        score = evaluation(board)
        return score if board.turn == chess.WHITE else -score

    best_score = -float("inf")

    for move in board.legal_moves:
        board.push(move)
        score = -negmax(board, depth - 1, -beta, -alpha)
        board.pop()

        if score > best_score:
            best_score = score

        alpha = max(alpha, score)
        if alpha >= beta:
            break

    return best_score


def search(board: chess.Board, depth: int = 2) -> chess.Move:
    legal_moves = list(board.legal_moves)

    if not legal_moves:
        raise ValueError("Position contains no legal moves")

    best_move = legal_moves[0]
    best_score = -float("inf")
    alpha = -float("inf")
    beta = float("inf")

    for move in legal_moves:
        board.push(move)
        score = -negmax(board, depth - 1, -beta, -alpha)
        board.pop()

        if score > best_score:
            best_score = score
            best_move = move

        alpha = max(alpha, score)

    return best_move
