# ML Chess Engine

A deployed full-stack chess app where users play against a custom engine powered by a PyTorch board-position evaluator and Negamax search with alpha-beta pruning.

**Live demo:** https://chess-engine-rose.vercel.app

## What It Does

- Lets the user play as White against the engine.
- Displays an interactive chessboard in the browser.
- Sends board positions to the backend using FEN notation.
- Returns engine moves in UCI notation.
- Shows game status, move history, last-move highlights, and backend health/warm-up state.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Chess UI and rules:** react-chessboard, chess.js
- **Backend:** FastAPI, Python, python-chess
- **ML/search:** PyTorch evaluator, Negamax search, alpha-beta pruning
- **Deployment:** Vercel frontend, Render backend

## How It Works

1. The player moves a White piece on the board.
2. `chess.js` validates the move on the client.
3. The frontend sends the updated board position to the FastAPI backend using FEN notation.
4. The backend validates the FEN with `python-chess`.
5. The engine generates legal replies and searches them using Negamax with alpha-beta pruning.
6. Leaf positions are scored with the PyTorch neural network evaluator.
7. The backend returns the selected move in UCI notation.
8. The frontend applies the move, updates the board, highlights the last move, and records move history.

## Model and Engine Details

- The engine combines a PyTorch board-position evaluator with Negamax search and alpha-beta pruning.
- The neural network evaluates board positions from White's perspective.
- The model does not directly predict the next move.
- The search algorithm generates legal moves, evaluates resulting positions with the neural network, and selects the best move.
- The deployed app uses depth 1 search for lower latency on the hosted backend.
- The same search code can run at deeper depths locally. Depth 3-5 produces stronger play but takes longer.

## Model Training and Evaluation

The evaluator was trained and evaluated in Google Colab using [`chess_evaluation_model.ipynb`](chess_evaluation_model.ipynb).

- Training data: about 500,000 Stockfish-labeled chess positions.
- Valid positions after validation: 497,487.
- Split method: deterministic split by hashing each FEN.
- Board encoding: 18-channel 8x8 tensor with piece locations, side to move, castling rights, and en passant information.
- Target: normalized board evaluation score. Centipawn labels are clipped/scaled, and mate labels are converted into signed targets.
- Exported model artifact: [`backend/models/chess_evaluator_v1.pt`](backend/models/chess_evaluator_v1.pt).

| Split | Positions |
| --- | ---: |
| Train | 398,160 |
| Validation | 49,507 |
| Test | 49,820 |

| Metric | Result |
| --- | ---: |
| Test MAE | 0.187 |
| Material baseline test MAE | 0.314 |
| Balanced sign accuracy | 85.7% |
| Positive sign accuracy | 93.8% |
| Negative sign accuracy | 77.6% |
| Mate sign accuracy | 97.8% |
| Best epoch | 13 |

## Project Structure

```text
frontend/                       Next.js app and chess UI
backend/                        FastAPI API, search logic, and model inference
backend/engine/search.py         Negamax search with alpha-beta pruning
backend/engine/evaluation.py     PyTorch evaluator loading and board encoding
backend/models/                  Exported model artifact
chess_evaluation_model.ipynb     Colab notebook for training and evaluation
```

## Local Development

Run the backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

By default, the frontend uses `http://127.0.0.1:8000` in development. Set `NEXT_PUBLIC_API_URL` to use a different backend URL.

## Deployment Notes

The frontend is deployed on Vercel. The backend is deployed on Render.

The Render backend may need time to wake up on the free tier. The frontend checks `/health` and shows a warm-up state until the API is ready.

There is also a GitHub Actions workflow that can call the backend health endpoint on a schedule. Set this repository variable if using the workflow:

```text
BACKEND_URL=https://ml-chess-engine.onrender.com
```
