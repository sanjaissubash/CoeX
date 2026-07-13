#!/bin/bash

set -e

echo "🚀 Starting CoeX"
echo "======================================"
echo ""

# Activate venv
source .venv/bin/activate

# Backend
echo "📦 Starting Flask backend on port 5001..."
python -m backend.run --port 5001 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

sleep 3

# Frontend
echo "📦 Starting Next.js frontend on port 3000..."
cd frontend
npm run dev -- -p 3000 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

cd ..

echo ""
echo "======================================"
echo "✅ All services running!"
echo "======================================"
echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://127.0.0.1:5001"
echo "API:       http://127.0.0.1:5001/api"
echo ""
echo "Press Ctrl+C to stop"
echo ""

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ""; echo "Services stopped"; exit 0' INT

wait
