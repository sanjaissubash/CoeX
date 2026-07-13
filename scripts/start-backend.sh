#!/usr/bin/env bash
# Helper to create (if missing) and activate a project venv, install deps, and run the backend.
# Usage: ./scripts/start-backend.sh [--port PORT]

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$ROOT_DIR/venv"
PORT=8082

if [[ "${1:-}" == "--port" ]]; then
  PORT="$2"
fi

echo "Starting backend from $ROOT_DIR on port $PORT"

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating venv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"

pip install --upgrade pip setuptools wheel
# Install backend-specific requirements
pip install -r "$ROOT_DIR/backend/requirements.txt"

# Ensure storage dirs exist (best-effort)
python - <<PY
from backend.storage import ensure_storage_dirs
ensure_storage_dirs('storage')
print('Storage directories ensured')
PY

python -m backend.run --port "$PORT"
