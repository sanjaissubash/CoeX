#!/usr/bin/env bash
set -euo pipefail

# Simple dev startup script
# - creates/activates .venv (if missing)
# - installs python requirements (if not present)
# - starts backend on port 8082
# - starts Next dev from frontend on port 3000

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VENV="$ROOT_DIR/.venv"
if [ ! -d "$VENV" ]; then
  echo "Creating venv at $VENV"
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

# install requirements if not installed
if ! python -c "import flask" &>/dev/null; then
  echo "Installing Python requirements into venv..."
  python -m pip install --upgrade pip setuptools wheel
  python -m pip install -r requirements.txt
fi

# Start backend
echo "Starting backend on port 8082"
# Run backend in background and capture logs
mkdir -p /tmp/productos-dev-logs
python3 -m backend.run --port 8082 >/tmp/productos-dev-logs/backend.log 2>&1 &
BACKEND_PID=$!
sleep 0.8

# Start Next dev
export NEXT_PUBLIC_API_URL="http://127.0.0.1:8082/api"
echo "Starting Next dev server in frontend/ (logs -> /tmp/productos-dev-logs/next.log)"
npm run dev --prefix frontend >/tmp/productos-dev-logs/next.log 2>&1 &
NEXT_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Next PID: $NEXT_PID"
echo "Logs: /tmp/productos-dev-logs"

# print a few tail lines from logs to confirm startup
sleep 1
echo "--- backend log ---"
tail -n 40 /tmp/productos-dev-logs/backend.log || true

echo "--- next log ---"
tail -n 40 /tmp/productos-dev-logs/next.log || true

echo "Dev startup sequence launched. Visit http://localhost:3000 (or the port Next reports)"
