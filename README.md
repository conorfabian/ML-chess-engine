# ML Chess Engine

A full-stack chess project with a Next.js frontend and a FastAPI backend. The app lets a user play as White against a simple chess engine that responds with legal moves.

**Live demo:** https://chess-engine-rose.vercel.app

## What It Does

- Displays an interactive chessboard in the browser.
- Lets the user make legal White moves.
- Sends the current board position to a backend API using FEN notation.
- Returns a legal engine move in UCI notation.
- Applies the engine move on the board.
- Shows game status, move history, last-move highlights, and backend health state.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Chess UI and rules:** react-chessboard, chess.js
- **Backend:** FastAPI, Python, python-chess
- **Deployment:** Vercel for the frontend, Render for the backend

## How It Works

1. The player moves a White piece on the board.
2. `chess.js` checks that the move is legal.
3. The frontend sends the updated FEN position to the FastAPI backend.
4. The backend uses `python-chess` to choose a legal move.
5. The backend returns the move in UCI format.
6. The frontend applies the move and updates the board and move history.

## Project Structure

```text
frontend/   Next.js app and chess UI
backend/    FastAPI API and chess engine logic
.github/    GitHub Actions workflow for backend health checks
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
