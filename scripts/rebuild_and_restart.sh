#!/usr/bin/env zsh
# Rebuild and restart frontend and backend for local development/e2e
# - Stops processes on the known ports (3000 and 8082)
# - Builds frontend (next build)
# - Starts backend with backend/run.py (127.0.0.1:8082)
# - Starts frontend with `next start` (port 3000)
# - Logs go to /tmp/frontend.log and /tmp/backend.log

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"

FRONTEND_PORT=3000
BACKEND_PORT=8082
BACKEND_HOST=0.0.0.0

FRONTEND_LOG=/tmp/frontend.log
BACKEND_LOG=/tmp/backend.log

# Prefer the canonical backend venv (created on this machine). Fall back to
# .venv or a system python if missing. The canonical venv is `.venv_backend`.
if [ -x "$REPO_ROOT/venv/bin/python" ]; then
  VENV_PY="$REPO_ROOT/venv/bin/python"
elif [ -x "$REPO_ROOT/.venv/bin/python" ]; then
  VENV_PY="$REPO_ROOT/.venv/bin/python"
elif [ -x "$REPO_ROOT/.venv_backend/bin/python" ]; then
  VENV_PY="$REPO_ROOT/.venv_backend/bin/python"
else
  VENV_PY="python3"
fi

# Use the chosen python to invoke pip so packages are installed for the same interpreter
VENV_PIP="${VENV_PY} -m pip"

echo "Rebuild & restart started: $(date)"

echo "Stopping any processes on ports $FRONTEND_PORT and $BACKEND_PORT..."
# Kill any processes listening on those ports (if any)
if command -v lsof >/dev/null 2>&1; then
  for p in $(lsof -i tcp:${FRONTEND_PORT} -sTCP:LISTEN -t 2>/dev/null || true); do
    echo "Killing frontend pid $p" || true
    kill $p >/dev/null 2>&1 || true
  done
  for p in $(lsof -i tcp:${BACKEND_PORT} -sTCP:LISTEN -t 2>/dev/null || true); do
    echo "Killing backend pid $p" || true
    kill $p >/dev/null 2>&1 || true
  done
fi

# Optionally, try pkill as a fallback
pkill -f "next start" >/dev/null 2>&1 || true
pkill -f "backend/run.py" >/dev/null 2>&1 || true
pkill -f "python .*backend/main.py" >/dev/null 2>&1 || true

# Build frontend
echo "Building frontend..."
cd "$FRONTEND_DIR"
npm ci --silent || npm install --silent
npm run build --silent

echo "Starting backend (${BACKEND_HOST}:${BACKEND_PORT})..."
# Ensure backend dependencies installed in venv
echo "Ensuring backend Python deps installed (using ${VENV_PIP})..."
cd "$REPO_ROOT"
${VENV_PIP} install -r backend/requirements.txt >/dev/null 2>&1 || true

echo "Starting backend (${BACKEND_HOST}:${BACKEND_PORT}) using ${VENV_PY}..."
# run backend in background, with logs redirected
"${VENV_PY}" -m backend.run --host ${BACKEND_HOST} --port ${BACKEND_PORT} --debug >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!
backend_ok=false
echo "Backend PID: ${BACKEND_PID} (logs: ${BACKEND_LOG})"

# Wait for backend health
echo "Waiting for backend to be available..."
for i in {1..30}; do
  if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/health" >/dev/null 2>&1; then
    echo "Backend is up"
    backend_ok=true
    break
  fi
  sleep 1
done

if [ "$backend_ok" = false ]; then
  echo "Backend failed to start; check ${BACKEND_LOG} for details"
fi

if [ "$backend_ok" = false ]; then
  echo "Backend failed to start after fallback; check ${BACKEND_LOG} for details"
fi

# Start frontend
echo "Starting frontend (port ${FRONTEND_PORT})..."
cd "$FRONTEND_DIR"
NODE_ENV=production PORT=${FRONTEND_PORT} nohup npm run start --silent >"${FRONTEND_LOG}" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: ${FRONTEND_PID} (logs: ${FRONTEND_LOG})"

# Wait for frontend to be available
echo "Waiting for frontend to be available..."
for i in {1..30}; do
  if curl -s "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null 2>&1; then
    echo "Frontend is up"
    break
  fi
  sleep 1
done

echo "Rebuild & restart complete: $(date)"
echo "Backend PID: ${BACKEND_PID}, logs: ${BACKEND_LOG}"
echo "Frontend PID: ${FRONTEND_PID}, logs: ${FRONTEND_LOG}"

echo "Tail the logs:"
echo "  tail -n 200 ${BACKEND_LOG}"
echo "  tail -n 200 ${FRONTEND_LOG}"

exit 0
