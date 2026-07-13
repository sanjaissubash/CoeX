# CoeX Server Setup and Rebuild Guide

This guide explains how to install the current CoeX app on a fresh server after cloning the repository.

It is based on the current app structure:

- Backend: Flask app in `backend/`
- Frontend: Next.js app in `frontend/`
- Database: SQLite at `storage/coex.db` (or overridden in env)
- Uploaded files/assets: `storage/projects`, `storage/families`, `storage/uploads`
- Backend port: `5001`
- Frontend port: `3000`
- API base URL: `http://127.0.0.1:5001/api` locally, or `https://your-domain.com/api` behind Nginx

---

## Important Notes

- Use `backend/requirements.txt` for python dependencies.
- The backend creates database tables automatically on the first incoming request.
- Keep the `storage/` directory writable by the system user running the backend process.
- For production, run both services using `systemd` process managers.

---

## Recommended Server Requirements

For Ubuntu 22.04 or 24.04:

- Python 3.11 or newer (Python 3.12 recommended)
- Node.js 20 LTS
- npm / git

Install base packages:
```bash
sudo apt update
sudo apt install -y git curl build-essential python3 python3-venv python3-pip nginx
```

Install Node.js 20 LTS:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

## Fresh Clone Setup

Example deploy path:
```bash
sudo mkdir -p /var/www/coex
sudo chown "$USER":"$USER" /var/www/coex
git clone <your-repo-url> /var/www/coex
cd /var/www/coex
```

Create storage folders:
```bash
mkdir -p storage/projects storage/families storage/uploads storage/exports logs
```

Install backend dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

Install and build frontend:
```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api npm run build
cd ..
```

Start backend manually:
```bash
python -m backend.run --port 5001
```

Start frontend manually in another terminal:
```bash
cd frontend
PORT=3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api npm run start
```

Open:
```text
http://your-server-ip:3000
```

---

## One-Shot Setup Script

After cloning the repo on a server, save this as `server_setup.sh` in the repo root if you want a repeatable setup command:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:${BACKEND_PORT}/api}"

cd "$APP_DIR"

echo "Creating required folders..."
mkdir -p storage/projects storage/families storage/uploads storage/exports logs

echo "Setting up Python virtual environment..."
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

./.venv/bin/python -m pip install --upgrade pip setuptools wheel
./.venv/bin/python -m pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building frontend..."
NEXT_PUBLIC_API_URL="$API_URL" npm run build
cd "$APP_DIR"

echo "Initializing backend database schema..."
./.venv/bin/python - <<'PY'
from backend import create_app
from backend.database import init_db

app = create_app()
with app.app_context():
    init_db(app)
print("Database initialized")
PY

echo "Setup complete."
echo "Backend command:"
echo "  ./.venv/bin/python -m backend.run --port ${BACKEND_PORT}"
echo "Frontend command:"
echo "  cd frontend && PORT=${FRONTEND_PORT} NEXT_PUBLIC_API_URL=${API_URL} npm run start"
```

Run it:
```bash
chmod +x server_setup.sh
./server_setup.sh
```

---

## Rebuild and Restart Flow

Use this process after pulling new code changes:
```bash
cd /var/www/coex
git pull

./.venv/bin/pip install -r backend/requirements.txt

cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api npm run build
cd ..

sudo systemctl restart coex-backend
sudo systemctl restart coex-frontend
```

If you are not using `systemd`, stop the old processes and restart manually:
```bash
lsof -ti tcp:5001 | xargs -r kill
lsof -ti tcp:3000 | xargs -r kill

./.venv/bin/python -m backend.run --port 5001
cd frontend
PORT=3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api npm run start
```

---

## Systemd Services

Create backend service:
```bash
sudo nano /etc/systemd/system/coex-backend.service
```

Paste:
```ini
[Unit]
Description=CoeX Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/coex
ExecStart=/var/www/coex/.venv/bin/python -m backend.run --port 5001
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Create frontend service:
```bash
sudo nano /etc/systemd/system/coex-frontend.service
```

Paste:
```ini
[Unit]
Description=CoeX Frontend
After=network.target coex-backend.service

[Service]
Type=simple
WorkingDirectory=/var/www/coex/frontend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable coex-backend coex-frontend
sudo systemctl start coex-backend coex-frontend
```

---

## Nginx Reverse Proxy Configuration

Recommended public setup:
- Browser visits `https://your-domain.com`
- Nginx forwards frontend traffic to `127.0.0.1:3000`
- Nginx forwards `/api/` to `127.0.0.1:5001/api/`
- Build frontend with `NEXT_PUBLIC_API_URL=https://your-domain.com/api`

Example Nginx site config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Database and Storage

Current active data:
```text
storage/coex.db
storage/projects/
storage/families/
storage/uploads/
```

The backend creates tables automatically. No manual migration command is currently required for a fresh install.

Back up data:
```bash
cd /var/www/coex
mkdir -p storage/exports
tar -czf storage/exports/coex-backup-$(date +%Y%m%d-%H%M%S).tar.gz storage/coex.db storage/projects storage/families storage/uploads
```

Restore from backup:
```bash
cd /var/www/coex
sudo systemctl stop coex-backend coex-frontend
tar -xzf storage/exports/coex-backup-YYYYMMDD-HHMMSS.tar.gz
sudo systemctl start coex-backend coex-frontend
```

Reset to a fresh empty app:
```bash
cd /var/www/coex
sudo systemctl stop coex-backend coex-frontend
rm -f storage/coex.db storage/coex.db-shm storage/coex.db-wal
find storage/projects -mindepth 1 -exec rm -rf {} +
find storage/families -mindepth 1 -exec rm -rf {} +
find storage/uploads -mindepth 1 -exec rm -rf {} +
sudo systemctl start coex-backend coex-frontend
```

---

## Smoke Checks

Backend health:
```bash
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:5001/api/projects
curl http://127.0.0.1:5001/api/families
```

Frontend:
```bash
curl -I http://127.0.0.1:3000
```

If using nginx:
```bash
curl -I https://your-domain.com
```

---

## Local E2E Tests

The frontend includes Playwright tests:
```bash
cd frontend
npm run test:e2e
```

These tests create data in the active SQLite database. Run them only on local/dev data, or reset the database afterward.

---

## Troubleshooting

Port already in use:
```bash
lsof -i tcp:3000
lsof -i tcp:5001
```

Kill a stuck process:
```bash
lsof -ti tcp:3000 | xargs -r kill
lsof -ti tcp:5001 | xargs -r kill
```

Frontend still calls the wrong API:
- Rebuild the frontend with the correct `NEXT_PUBLIC_API_URL`.
- Check browser localStorage for `coex_api_url`; the app can override the env value from localStorage.

Backend cannot write files:
```bash
sudo chown -R www-data:www-data /var/www/coex/storage /var/www/coex/logs
sudo chmod -R u+rwX /var/www/coex/storage /var/www/coex/logs
```

SQLite database locked:
- Make sure only one backend process writes to `storage/coex.db`.
- Stop duplicate backend processes.
- Restart `coex-backend`.

Frontend build fails:
```bash
cd /var/www/coex/frontend
rm -rf .next node_modules
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api npm run build
```

Backend dependency issue:
```bash
cd /var/www/coex
./.venv/bin/python -m pip install --upgrade pip setuptools wheel
./.venv/bin/python -m pip install -r backend/requirements.txt
./.venv/bin/python -m compileall backend
```

---

## Recommended Deployment Checklist

1. Clone repo to `/var/www/coex`.
2. Install Python and Node dependencies.
3. Create `storage/` folders.
4. Build frontend with the correct `NEXT_PUBLIC_API_URL`.
5. Start backend and frontend manually once.
6. Verify `/api/health`, `/api/projects`, and frontend root.
7. Add systemd services.
8. Add nginx reverse proxy.
9. Add HTTPS with Certbot.
10. Set up regular backups for `storage/coex.db` and uploaded files.
