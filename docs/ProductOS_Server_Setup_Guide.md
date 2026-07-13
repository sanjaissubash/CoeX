# ProductOS Server Setup and Rebuild Guide

This guide explains how to install the current ProductOS app on a fresh server after cloning the repository.

It is based on the current app structure:

- Backend: Flask app in `backend/`
- Frontend: Next.js app in `frontend/`
- Database: SQLite at `storage/productos.db`
- Uploaded files/assets: `storage/products`, `storage/families`, `storage/uploads`
- Backend port: `8082`
- Frontend port: `3000`
- API base URL: `http://127.0.0.1:8082/api` locally, or `https://your-domain.com/api` behind nginx

## Important Notes

- Use `backend/requirements.txt` for the backend. The root `requirements.txt` appears to be older and does not exactly match the backend version currently used by the app.
- The existing root `setup.sh`, `start.sh`, and parts of `DEPLOYMENT.md` contain older or legacy paths. Do not use them as the source of truth without updating them.
- The backend creates database tables automatically on the first incoming request.
- Keep `storage/` writable by the user running the backend.
- For production, run both services with `systemd` or another process manager.

## Recommended Server Requirements

For Ubuntu 22.04 or 24.04:

- Python 3.11 or newer
- Node.js 20 LTS
- npm
- git
- build tools
- nginx, optional but recommended for a public server

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

## Fresh Clone Setup

Example deploy path:

```bash
sudo mkdir -p /var/www/productos
sudo chown "$USER":"$USER" /var/www/productos
git clone <your-repo-url> /var/www/productos
cd /var/www/productos
```

Create storage folders:

```bash
mkdir -p storage/products storage/families storage/uploads storage/exports logs
```

Install backend dependencies:

```bash
python3 -m venv venv
./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/python -m pip install -r backend/requirements.txt
```

Install and build frontend:

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api npm run build
cd ..
```

Start backend manually:

```bash
./venv/bin/python -m backend.run --host 0.0.0.0 --port 8082
```

Start frontend manually in another terminal:

```bash
cd frontend
PORT=3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api npm run start
```

Open:

```text
http://your-server-ip:3000
```

## One-Shot Setup Script

After cloning the repo on a server, save this as `server_setup.sh` in the repo root if you want a repeatable setup command.

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8082}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:${BACKEND_PORT}/api}"

cd "$APP_DIR"

echo "Creating required folders..."
mkdir -p storage/products storage/families storage/uploads storage/exports logs

echo "Setting up Python virtual environment..."
if [ ! -d venv ]; then
  python3 -m venv venv
fi

./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/python -m pip install -r backend/requirements.txt

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building frontend..."
NEXT_PUBLIC_API_URL="$API_URL" npm run build
cd "$APP_DIR"

echo "Initializing backend database schema..."
./venv/bin/python - <<'PY'
from backend import create_app
from backend.database import init_db

app = create_app()
with app.app_context():
    init_db(app)
print("Database initialized")
PY

echo "Setup complete."
echo "Backend command:"
echo "  ./venv/bin/python -m backend.run --host 0.0.0.0 --port ${BACKEND_PORT}"
echo "Frontend command:"
echo "  cd frontend && PORT=${FRONTEND_PORT} NEXT_PUBLIC_API_URL=${API_URL} npm run start"
```

Run it:

```bash
chmod +x server_setup.sh
./server_setup.sh
```

## Rebuild and Restart Flow

Use this process after pulling new code:

```bash
cd /var/www/productos
git pull

./venv/bin/python -m pip install -r backend/requirements.txt

cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api npm run build
cd ..

sudo systemctl restart productos-backend
sudo systemctl restart productos-frontend
```

If you are not using `systemd`, stop the old processes and restart manually:

```bash
lsof -ti tcp:8082 | xargs -r kill
lsof -ti tcp:3000 | xargs -r kill

./venv/bin/python -m backend.run --host 0.0.0.0 --port 8082
cd frontend
PORT=3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api npm run start
```

## Systemd Services

Create backend service:

```bash
sudo nano /etc/systemd/system/productos-backend.service
```

Paste:

```ini
[Unit]
Description=ProductOS Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/productos
ExecStart=/var/www/productos/venv/bin/python -m backend.run --host 0.0.0.0 --port 8082
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Create frontend service:

```bash
sudo nano /etc/systemd/system/productos-frontend.service
```

Paste:

```ini
[Unit]
Description=ProductOS Frontend
After=network.target productos-backend.service

[Service]
Type=simple
WorkingDirectory=/var/www/productos/frontend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable productos-backend productos-frontend
sudo systemctl start productos-backend productos-frontend
```

Check status:

```bash
sudo systemctl status productos-backend
sudo systemctl status productos-frontend
```

View logs:

```bash
sudo journalctl -u productos-backend -n 200 -f
sudo journalctl -u productos-frontend -n 200 -f
```

## Nginx Reverse Proxy

Recommended public setup:

- Browser visits `https://your-domain.com`
- Nginx forwards frontend traffic to `127.0.0.1:3000`
- Nginx forwards `/api/` to `127.0.0.1:8082/api/`
- Build frontend with `NEXT_PUBLIC_API_URL=https://your-domain.com/api`

Example nginx site:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:8082/api/;
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

Enable it:

```bash
sudo nano /etc/nginx/sites-available/productos.conf
sudo ln -s /etc/nginx/sites-available/productos.conf /etc/nginx/sites-enabled/productos.conf
sudo nginx -t
sudo systemctl reload nginx
```

For HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

After switching to a public domain, rebuild frontend:

```bash
cd /var/www/productos/frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api npm run build
sudo systemctl restart productos-frontend
```

Also update `/etc/systemd/system/productos-frontend.service`:

```ini
Environment=NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

Then reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart productos-frontend
```

## Database and Storage

Current active data:

```text
storage/productos.db
storage/products/
storage/families/
storage/uploads/
```

The backend creates tables automatically. No manual migration command is currently required for a fresh install.

Back up data:

```bash
cd /var/www/productos
mkdir -p storage/exports
tar -czf storage/exports/productos-backup-$(date +%Y%m%d-%H%M%S).tar.gz storage/productos.db storage/products storage/families storage/uploads
```

Restore from backup:

```bash
cd /var/www/productos
sudo systemctl stop productos-backend productos-frontend
tar -xzf storage/exports/productos-backup-YYYYMMDD-HHMMSS.tar.gz
sudo systemctl start productos-backend productos-frontend
```

Reset to a fresh empty app:

```bash
cd /var/www/productos
sudo systemctl stop productos-backend productos-frontend
rm -f storage/productos.db storage/productos.db-shm storage/productos.db-wal
find storage/products -mindepth 1 -exec rm -rf {} +
find storage/families -mindepth 1 -exec rm -rf {} +
find storage/uploads -mindepth 1 -exec rm -rf {} +
sudo systemctl start productos-backend productos-frontend
```

## Smoke Checks

Backend health:

```bash
curl http://127.0.0.1:8082/api/health
curl http://127.0.0.1:8082/api/products
curl http://127.0.0.1:8082/api/families
```

Frontend:

```bash
curl -I http://127.0.0.1:3000
```

If using nginx:

```bash
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

## Local E2E Tests

The frontend includes Playwright tests:

```bash
cd frontend
npm run test:e2e
```

These tests create data in the active SQLite database. Run them only on local/dev data, or reset the database afterward.

## Troubleshooting

Port already in use:

```bash
lsof -i tcp:3000
lsof -i tcp:8082
```

Kill a stuck process:

```bash
lsof -ti tcp:3000 | xargs -r kill
lsof -ti tcp:8082 | xargs -r kill
```

Frontend still calls the wrong API:

- Rebuild the frontend with the correct `NEXT_PUBLIC_API_URL`.
- Check browser localStorage for `productos_api_url`; the app can override the env value from localStorage.

Backend cannot write files:

```bash
sudo chown -R www-data:www-data /var/www/productos/storage /var/www/productos/logs
sudo chmod -R u+rwX /var/www/productos/storage /var/www/productos/logs
```

If running as a non-`www-data` deploy user, use that user instead.

SQLite database locked:

- Make sure only one backend process writes to `storage/productos.db`.
- Stop duplicate backend processes.
- Restart `productos-backend`.

Frontend build fails:

```bash
cd /var/www/productos/frontend
rm -rf .next node_modules
npm ci
NEXT_PUBLIC_API_URL=http://127.0.0.1:8082/api npm run build
```

Backend dependency issue:

```bash
cd /var/www/productos
./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/python -m pip install -r backend/requirements.txt
./venv/bin/python -m compileall backend
```

## Recommended Deployment Checklist

1. Clone repo to `/var/www/productos`.
2. Install Python and Node dependencies.
3. Create `storage/` folders.
4. Build frontend with the correct `NEXT_PUBLIC_API_URL`.
5. Start backend and frontend manually once.
6. Verify `/api/health`, `/api/products`, and frontend root.
7. Add systemd services.
8. Add nginx reverse proxy.
9. Add HTTPS with Certbot.
10. Set up regular backups for `storage/productos.db` and uploaded files.

