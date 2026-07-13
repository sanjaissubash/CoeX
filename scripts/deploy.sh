#!/usr/bin/env bash
# CoeX Deployment Script for Linux EC2 Server
set -euo pipefail

APP_DIR="/var/www/coex"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:5001/api}"

echo "🔄 Navigating to application directory..."
cd "$APP_DIR"

echo "📥 Fetching latest changes from Git..."
# Reset any local tracking changes to ensure a clean pull
git fetch --all
git reset --hard origin/main

echo "🐍 Updating Python backend dependencies..."
./venv/bin/python -m pip install -r backend/requirements.txt

echo "🎨 Installing frontend packages..."
cd frontend
npm ci

echo "🛠️ Rebuilding frontend assets..."
NEXT_PUBLIC_API_URL="$API_URL" npm run build
cd "$APP_DIR"

echo "🔄 Restarting CoeX Services via systemd..."
sudo systemctl restart coex-backend.service
sudo systemctl restart coex-frontend.service

echo "🚀 CoeX successfully deployed and restarted!"
