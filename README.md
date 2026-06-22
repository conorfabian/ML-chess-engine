# Conor Chess Engine

A Next.js chess interface backed by a FastAPI chess engine. The frontend uses
`chess.js` for legal moves and sends FEN positions to the deployed API, which
returns an engine move in UCI notation.

## Local development

Run the backend from `backend/`:

```bash
uvicorn main:app --reload
```

Run the frontend from `frontend/`:

```bash
npm run dev
```

The frontend uses `http://127.0.0.1:8000` in development. Set
`NEXT_PUBLIC_API_URL` to override the backend URL.

## Free Render warm-up

The production backend runs on Render's free tier. A scheduled GitHub Actions
workflow requests `/health` every 10 minutes to reduce idle spin-downs. Add this
repository variable under **Settings > Secrets and variables > Actions >
Variables**:

```text
BACKEND_URL=https://ml-chess-engine.onrender.com
```

Do not include a trailing slash. The workflow can also be run manually from the
Actions tab. GitHub schedules are best-effort, so the frontend still polls the
health endpoint and displays a warm-up overlay until the API is ready.

GitHub automatically disables scheduled workflows in public repositories after
60 days without repository activity. Before sharing a dormant deployment,
re-enable this workflow from the Actions tab. For unattended long-term uptime,
configure a free external monitor to request the same `/health` URL every 10
minutes instead of relying only on GitHub Actions.

Render grants 750 free instance hours per workspace each month. One continuously
running service fits within that allowance, but other free services in the same
workspace share it.
