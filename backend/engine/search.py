import chess

from engine.evaluation import evaluation

def minimax(board: chess.Board, depth: int) -> chess.Move:
    pass

def search(board: chess.Board) -> chess.Move:
    legal_moves = list(board.legal_moves)

    if not legal_moves:
        raise ValueError("Position contains no legal moves")
    
    best_move = legal_moves[0]
    best_score = float("-inf") if board.turn == chess.WHITE else float("inf")

    for move in legal_moves:
        board.push(move)
        score = evaluation(board)
        board.pop()

        if board.turn == chess.WHITE and score > best_score:
            best_score = score
            best_move = move
        elif board.turn == chess.BLACK and score < best_score:
            best_score = score
            best_move = move

    return best_move
