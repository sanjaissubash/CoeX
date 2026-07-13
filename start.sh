#!/bin/bash

set -e

echo "🚀 Starting CoeX"
echo "======================================"
echo ""

# Activate venv (.venv for local macOS, venv for servers)
if [ -f .venv/bin/activate ]; then
	# local development venv
	source .venv/bin/activate
elif [ -f venv/bin/activate ]; then
	# server venv
	source venv/bin/activate
else
	echo "❌ No virtualenv found. Run setup.sh first to create .venv (mac) or venv (server)." >&2
	exit 1
fi

# Backend
# Allow override via BACKEND_PORT env var; find a free port if the desired one is taken.
DESIRED_PORT=${BACKEND_PORT:-5001}
find_free_port() {
	local port=$1
	while :; do
		if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
			echo "$port"
			return
		fi
		port=$((port + 1))
		if [ "$port" -gt 5100 ]; then
			echo ""
			return
		fi
	done
}

PORT=$(find_free_port "$DESIRED_PORT")
if [ -z "$PORT" ]; then
	echo "❌ Could not find a free backend port (tried from $DESIRED_PORT to 5100)." >&2
	exit 1
fi

echo "📦 Starting Flask backend on port $PORT..."
python -m backend.run --port "$PORT" &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

sleep 3

# Frontend
echo "📦 Starting Next.js frontend on port 3000..."
cd frontend
# Pass the backend API URL to the frontend dev server so it knows where API lives
export NEXT_PUBLIC_API_URL="http://localhost:${PORT}/api"
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
echo "Backend:   http://127.0.0.1:${PORT}"
echo "API:       http://127.0.0.1:${PORT}/api"
echo ""
echo "Press Ctrl+C to stop"
echo ""

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ""; echo "Services stopped"; exit 0' INT

wait
