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
  # Prefer specific Python interpreters known to be compatible (3.11, 3.12, 3.10),
  # fall back to system python3 if needed.
  PYTHON=$(command -v python3.11 || command -v python3.12 || command -v python3.10 || command -v python3)
  if [ -z "$PYTHON" ]; then
    echo "❌ Error: No suitable Python interpreter found (tried python3.11, python3.12, python3.10, python3)." >&2
    exit 1
  fi
  echo "Using Python interpreter: $PYTHON"
  PY_VER=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  if [ "${PY_VER}" = "3.13" ] || ( [ "${PY_VER%%.*}" = "3" ] && [ "${PY_VER#*.}" -ge 13 ] 2>/dev/null ); then
    echo ""
    echo "⚠️ Unsupported Python version detected: ${PY_VER}." >&2
    echo "The project requires Python 3.10/3.11/3.12 for SQLAlchemy compatibility." >&2
    read -rp "Install python@3.11 via Homebrew now? (y/N): " install_py
    if [ "$install_py" = "y" ] || [ "$install_py" = "Y" ]; then
      if ! command -v brew >/dev/null 2>&1; then
        echo "❌ Homebrew is not installed. Please install Homebrew from https://brew.sh and re-run this script." >&2
        exit 1
      fi
      echo "Installing python@3.11 via Homebrew (auto-confirming)..."
      export HOMEBREW_NO_AUTO_UPDATE=1
      export HOMEBREW_NO_ENV_HINTS=1
      yes | brew install python@3.11
      # attempt to link so python3.11 is on PATH
      brew link --overwrite python@3.11 || true
      # Try to locate the installed python3.11 binary
      PYTHON=$(command -v python3.11 || /opt/homebrew/opt/python@3.11/bin/python3.11 || /usr/local/opt/python@3.11/bin/python3.11 || true)
      if [ -z "$PYTHON" ]; then
        echo "❌ python3.11 not found after Homebrew install. Please ensure Homebrew installed python@3.11 correctly." >&2
        exit 1
      fi
      echo "Installed: $($PYTHON --version 2>&1)"
      PY_VER=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      if [ "${PY_VER}" = "3.13" ] || ( [ "${PY_VER%%.*}" = "3" ] && [ "${PY_VER#*.}" -ge 13 ] 2>/dev/null ); then
        echo "❌ Installed Python is still unsupported: ${PY_VER}. Aborting." >&2
        exit 1
      fi
    else
      echo "Please install Python 3.11 or 3.12 (example: brew install python@3.11) and re-run this script." >&2
      exit 1
    fi
  fi
  # If .venv exists, verify its Python version; if incompatible, recreate it.
  recreate_venv=false
  if [ -d .venv ]; then
    if [ -x .venv/bin/python ]; then
      EXISTING_VER=$(.venv/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      if [ "${EXISTING_VER}" = "${PY_VER}" ]; then
        echo "Found existing .venv with Python ${EXISTING_VER}, reusing."
      else
        echo "Existing .venv Python ${EXISTING_VER} is incompatible; will recreate with ${PY_VER}."
        recreate_venv=true
      fi
    else
      recreate_venv=true
    fi
  else
    recreate_venv=true
  fi

  if [ "$recreate_venv" = true ]; then
    rm -rf .venv
    "$PYTHON" -m venv .venv
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
  echo "🐍 Initializing Python Virtual Environment (venv)..."
  # Prefer specific Python interpreters known to be compatible (3.11, 3.12, 3.10),
  # fall back to system python3 if needed.
  PYTHON=$(command -v python3.11 || command -v python3.12 || command -v python3.10 || command -v python3)
  if [ -z "$PYTHON" ]; then
    echo "❌ Error: No suitable Python interpreter found (tried python3.11, python3.12, python3.10, python3)." >&2
    exit 1
  fi
  echo "Using Python interpreter: $PYTHON"
  PY_VER=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  # If Python is unsupported (3.13+), offer to install python3.11 via apt
  if [ "${PY_VER}" = "3.13" ] || ( [ "${PY_VER%%.*}" = "3" ] && [ "${PY_VER#*.}" -ge 13 ] 2>/dev/null ); then
    echo ""
    echo "⚠️ Unsupported Python version detected: ${PY_VER}." >&2
    echo "The project requires Python 3.10/3.11/3.12 for SQLAlchemy compatibility." >&2
    read -rp "Install python3.11 via apt now? (requires sudo) (y/N): " install_py
    if [ "$install_py" = "y" ] || [ "$install_py" = "Y" ]; then
      echo "Installing python3.11 and venv packages via apt (non-interactive)..."
      sudo env DEBIAN_FRONTEND=noninteractive apt-get update -y
      sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y python3.11 python3.11-venv python3.11-distutils
      PYTHON=$(command -v python3.11 || true)
      if [ -z "$PYTHON" ]; then
        echo "❌ python3.11 not found after apt install. Please check apt logs." >&2
        exit 1
      fi
      echo "Installed: $($PYTHON --version 2>&1)"
      PY_VER=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      if [ "${PY_VER}" = "3.13" ] || ( [ "${PY_VER%%.*}" = "3" ] && [ "${PY_VER#*.}" -ge 13 ] 2>/dev/null ); then
        echo "❌ Installed Python is still unsupported: ${PY_VER}. Aborting." >&2
        exit 1
      fi
    else
      echo "Please install Python 3.11 or 3.12 and re-run this script." >&2
      exit 1
    fi
  fi

  # If venv exists, verify its Python version; if incompatible, recreate it.
  recreate_venv=false
  if [ -d venv ]; then
    if [ -x venv/bin/python ]; then
      EXISTING_VER=$(venv/bin/python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      if [ "${EXISTING_VER}" = "${PY_VER}" ]; then
        echo "Found existing venv with Python ${EXISTING_VER}, reusing."
      else
        echo "Existing venv Python ${EXISTING_VER} is incompatible; will recreate with ${PY_VER}."
        recreate_venv=true
      fi
    else
      recreate_venv=true
    fi
  else
    recreate_venv=true
  fi

  if [ "$recreate_venv" = true ]; then
    rm -rf venv
    "$PYTHON" -m venv venv
  fi
  venv/bin/python -m pip install --upgrade pip setuptools wheel
  venv/bin/python -m pip install -r backend/requirements.txt

  # Config Backend Environment
  echo "⚙️ Creating backend/.env..."
  cat > backend/.env << 'EOF'
FLASK_ENV=production
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/coex.db
EOF

  # Ask for Custom API URL (eg. https://domain.com/api) for frontend compilation
  read -rp "Enter public domain/IP API URL (fallback: /api): " custom_api_url
  API_URL="${custom_api_url:-/api}"

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

  # Install and configure Nginx to reverse-proxy frontend and backend
  echo "🔧 Installing and configuring Nginx..."
  sudo apt-get install -y nginx
  REPO_ROOT="$(pwd)"
  # Disable the default Nginx site if present
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo rm -f /etc/nginx/sites-available/default

  # Create nginx site config
  NGINX_CONF="/etc/nginx/sites-available/coex"
  sudo tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /_next/ {
        proxy_pass http://127.0.0.1:3000/_next/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/coex
  # Test and reload nginx
  sudo nginx -t && sudo systemctl restart nginx

  # Create systemd services for backend and frontend (so GitHub Actions or manual scripts can start/stop)
  echo "🔧 Creating systemd service units for CoeX..."
  BACKEND_SERVICE="/etc/systemd/system/coex-backend.service"
  FRONTEND_SERVICE="/etc/systemd/system/coex-frontend.service"
  sudo tee "$BACKEND_SERVICE" >/dev/null <<EOF
[Unit]
Description=CoeX Backend
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${REPO_ROOT}
ExecStart=${REPO_ROOT}/venv/bin/python -m backend.run --host 127.0.0.1 --port 5001
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

  sudo tee "$FRONTEND_SERVICE" >/dev/null <<EOF
[Unit]
Description=CoeX Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${REPO_ROOT}/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=/api
ExecStart=/bin/bash -lc 'npm run start'
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now coex-backend.service coex-frontend.service || true

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
