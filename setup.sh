#!/usr/bin/env bash

set -eo pipefail

echo "🚀 CoeX Setup Wizard"
echo "======================================"
echo "This script configures CoeX dependencies, environments, and folders."
echo ""
echo "Select your target environment:"
echo "1) Local macOS Development"
echo "2) AWS EC2 Ubuntu 24.04 Server Production"
echo ""
read -rp "Enter choice [1 or 2]: " env_choice

# Validate dependencies
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌ Error: $1 is required but not installed." >&2
    exit 1
  fi
}

if [ "$env_choice" = "1" ]; then
  echo "💻 Configuring Local macOS Environment..."
  check_dep python3
  check_dep node
  check_dep npm

  # Create storage folders
  echo "📂 Creating storage and log folders..."
  mkdir -p storage/projects storage/families storage/uploads storage/exports logs

  # Setup Virtual Environment
  echo "🐍 Initializing Python Virtual Environment (.venv)..."
  if [ ! -d .venv ]; then
    python3 -m venv .venv
  fi
  .venv/bin/python -m pip install --upgrade pip setuptools wheel
  .venv/bin/python -m pip install -r backend/requirements.txt

  # Config Backend Environment
  echo "⚙️ Creating backend/.env..."
  cat > backend/.env << 'EOF'
FLASK_ENV=development
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/coex.db
EOF

  # Config Frontend Environment
  echo "⚙️ Creating frontend/.env.local..."
  cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5001/api
PORT=3000
EOF

  # Install Node dependencies
  echo "📦 Installing Node dependencies..."
  cd frontend
  npm install
  cd ..

  echo ""
  echo "======================================"
  echo "✅ macOS Local Setup Complete!"
  echo "======================================"
  echo "To start CoeX concurrently on port 3000 (UI) and port 5001 (API):"
  echo "  bash start.sh"
  echo ""

elif [ "$env_choice" = "2" ]; then
  echo "☁️ Configuring AWS EC2 Ubuntu 24.04 Server Environment..."
  
  # Check system commands
  check_dep python3
  
  # Offer system apt upgrades
  read -rp "Run apt system update and install venv dependencies? (y/n): " run_apt
  if [ "$run_apt" = "y" ] || [ "$run_apt" = "Y" ]; then
    echo "Updating system packagers..."
    sudo apt update
    sudo apt install -y python3-venv python3-pip curl git build-essential
  fi

  # Check Node.js
  if ! command -v node &>/dev/null; then
    echo "Node.js not detected. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  fi

  # Create storage folders
  echo "📂 Creating storage and log folders..."
  mkdir -p storage/projects storage/families storage/uploads storage/exports logs
  chmod -R 775 storage logs

  # Setup Virtual Environment
  echo "🐍 Initializing Python Virtual Environment (.venv)..."
  if [ ! -d .venv ]; then
    python3 -m venv .venv
  fi
  .venv/bin/python -m pip install --upgrade pip setuptools wheel
  .venv/bin/python -m pip install -r backend/requirements.txt

  # Config Backend Environment
  echo "⚙️ Creating backend/.env..."
  cat > backend/.env << 'EOF'
FLASK_ENV=production
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/coex.db
EOF

  # Ask for Custom API URL (eg. https://domain.com/api) for frontend compilation
  read -rp "Enter public domain/IP API URL (fallback: http://localhost:5001/api): " custom_api_url
  API_URL="${custom_api_url:-http://localhost:5001/api}"

  echo "⚙️ Creating frontend/.env.local..."
  cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=${API_URL}
PORT=3000
EOF

  # Install Node dependencies and run production compilation
  echo "📦 Installing Node dependencies via npm ci..."
  cd frontend
  npm ci
  echo "🏗️ Building Next.js production bundle..."
  NEXT_PUBLIC_API_URL="${API_URL}" npm run build
  cd ..

  echo ""
  echo "======================================"
  echo "✅ Ubuntu 24.04 Server Setup Complete!"
  echo "======================================"
  echo "Deployment checklist & runner details have been compiled."
  echo "Refer to docs/CoeX_Server_Setup_Guide.md to configure Systemd and Nginx."
  echo ""

else
  echo "❌ Invalid selection. Exiting setup."
  exit 1
fi
