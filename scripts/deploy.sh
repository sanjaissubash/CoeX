#!/usr/bin/env bash
# CoeX Deployment Script for Linux EC2 Server
set -euo pipefail

# Configuration (override with env vars on the command line if desired)
APP_DIR="${APP_DIR:-/var/www/coex}"
API_URL="${NEXT_PUBLIC_API_URL:-https://coex.reduxai.online/api}"
DOMAIN="${DOMAIN:-coex.reduxai.online}"

echo "🔄 Deploy starting for CoeX (app dir: $APP_DIR)"

cd "$APP_DIR"

# timestamps and backup paths
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$APP_DIR/backups"

# Dry-run handling: pass --dry-run as first arg or set DRY_RUN=1 in env
DRY_RUN="false"
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN="true"
  shift
fi
if [ "${DRY_RUN:-}" = "1" ] || [ "${DRY_RUN:-}" = "true" ]; then
  DRY_RUN="true"
fi

run() {
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY_RUN] $*"
    return 0
  else
    eval "$*"
  fi
}

# create backup dir
run "mkdir -p \"$BACKUP_DIR\""
DB_PATH="$APP_DIR/storage/coex.db"
DB_BAK="$BACKUP_DIR/coex.db.$TS"
STORAGE_BAK="$BACKUP_DIR/coex-storage-$TS.tgz"

on_failure() {
  local rc="$1"; local lineno="$2"
  echo "❌ Deploy failed at line $lineno (exit $rc). Attempting rollback..."
  if [ -f "$DB_BAK" ]; then
    echo "↩️ Restoring DB backup $DB_BAK -> $DB_PATH"
    cp "$DB_BAK" "$DB_PATH" || echo "failed to restore DB"
  fi
  if [ -f "$STORAGE_BAK" ]; then
    echo "↩️ Restoring storage backup from $STORAGE_BAK"
    tar xzf "$STORAGE_BAK" -C "$APP_DIR" || echo "failed to restore storage"
  fi
  echo "🔁 Restarting services after rollback (best-effort)"
  sudo systemctl start coex-backend.service || true
  sudo systemctl start coex-frontend.service || true
  exit "$rc"
}

trap 'on_failure $? $LINENO' ERR

echo "⏹️ Stopping services for safe backup"
run "sudo systemctl stop coex-frontend.service || true"
run "sudo systemctl stop coex-backend.service || true"

echo "💾 Backing up DB and storage"
if [ -f "$DB_PATH" ]; then
  run "cp \"$DB_PATH\" \"$DB_BAK\""
  echo "Saved DB to $DB_BAK"
else
  echo "No DB file at $DB_PATH (continuing)"
fi

run "tar czf \"$STORAGE_BAK\" storage logs || true"
echo "Saved storage/logs to $STORAGE_BAK"

echo "📥 Fetching latest changes from Git (clean reset)"
run "git fetch --all"
run "git reset --hard origin/main"

echo "🐍 Ensuring Python venv and installing backend deps"
PYTHON_CMD=""
if command -v python3.11 >/dev/null 2>&1; then
  PYTHON_CMD="python3.11"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
else
  PYTHON_CMD="python"
fi

if [ ! -x "./venv/bin/python" ]; then
  echo "Creating venv with $PYTHON_CMD"
  run "$PYTHON_CMD -m venv venv"
fi

BACKEND_PY="./venv/bin/python"
run "\"$BACKEND_PY\" -m pip install --upgrade pip setuptools wheel"
run "\"$BACKEND_PY\" -m pip install -r backend/requirements.txt"

echo "🗄️ Applying DB migrations (Alembic if available)"
if [ -f backend/alembic.ini ] || [ -d backend/migrations ]; then
  echo "Running alembic upgrade head"
  run "\"$BACKEND_PY\" -m alembic -c backend/alembic.ini upgrade head || true"
else
  echo "No Alembic migrations found; running safe init_db fallback"
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY_RUN] Would run Python init_db block"
  else
    "$BACKEND_PY" - <<PY
from backend import create_app
from backend.database import init_db
app = create_app('production')
with app.app_context():
    init_db(app)
print('init_db complete')
PY
  fi
fi

echo "🎨 Installing and building frontend"
if [ "$DRY_RUN" = "true" ]; then
  echo "[DRY_RUN] cd frontend && NEXT_PUBLIC_API_URL=\"$API_URL\" npm ci && NEXT_PUBLIC_API_URL=\"$API_URL\" npm run build"
else
  cd frontend
  NEXT_PUBLIC_API_URL="$API_URL" npm ci
  NEXT_PUBLIC_API_URL="$API_URL" npm run build
  cd "$APP_DIR"
fi

echo "🔁 Starting services"
run "sudo systemctl daemon-reload || true"
run "sudo systemctl start coex-backend.service"
run "sudo systemctl start coex-frontend.service"

echo "🔎 Running smoke tests"
# API check (expects a reachable API URL)
if [ "$DRY_RUN" = "true" ]; then
  echo "[DRY_RUN] Would run API smoke check against $API_URL"
else
  if curl -fsS --max-time 10 "$API_URL" >/dev/null 2>&1; then
    echo "✅ API reachable: $API_URL"
  else
    echo "❌ API smoke check failed: $API_URL"
    # trigger failure to invoke rollback
    false
  fi
fi

# optional frontend domain check
if [ -n "$DOMAIN" ]; then
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY_RUN] Would run frontend smoke check against https://$DOMAIN"
  else
    if curl -fsS --max-time 10 "https://$DOMAIN" >/dev/null 2>&1; then
      echo "✅ Frontend reachable at https://$DOMAIN"
    else
      echo "❌ Frontend smoke check failed at https://$DOMAIN"
      false
    fi
  fi
fi

trap - ERR
echo "🚀 CoeX successfully deployed and healthy!"
