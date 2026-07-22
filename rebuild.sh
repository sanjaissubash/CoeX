#!/usr/bin/env bash

set -eo pipefail

echo "🚀 CoeX Rebuild Wizard (macOS Local)"
echo "======================================"
echo "This script updates dependencies and re-seeds the database for an existing macOS installation."
echo ""

# Pull latest changes if it's a git repository
if [ -d ".git" ]; then
    echo "🔄 Pulling latest code..."
    git pull origin main || true
fi

# Check Python Environment
if [ ! -d ".venv" ]; then
    echo "❌ Error: .venv not found. This does not look like a configured installation."
    echo "Please run ./setup.sh first."
    exit 1
fi

echo "📦 Updating Python backend dependencies..."
.venv/bin/python -m pip install -r backend/requirements.txt

echo "🌱 Updating Database and Prompts..."
.venv/bin/python backend/seed_workflow_prompts.py

echo "📦 Updating Node frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "======================================"
echo "✅ Rebuild Complete!"
echo "======================================"
echo "You can now run bash start.sh to launch CoeX."
echo ""
