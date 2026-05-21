#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Salsify Property Explorer..."
echo ""

# Start backend
echo "[backend] Starting FastAPI on http://localhost:8000"
cd "$ROOT"
python3 -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "[frontend] Starting Vite on http://localhost:5173"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
