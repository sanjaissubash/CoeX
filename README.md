# CoeX — Local-First AI Context & Memory Engine

CoeX is a local-first Project Knowledge & Context Management system. It serves as a permanent memory layer for projects based on cloud infrastructure and architecture, keeping your data secure, isolated, model-agnostic, and optimized for AI-assisted development.

---

## 🌟 Key Features

### 1. AI Context Generator
- Combines your project specifications, parsed cloud architectures, and guidelines into clean prompt templates.
- **Task Context Linkage**: Optionally link prompts directly to active project tasks to automatically inject title, description, priority, and status constraints.

### 2. Integrated Safety Leak Checker
- Automatically scans generated prompt packages for sensitive patterns (API keys, secret keys, emails) and custom global leak keywords.
- Manage custom leak keywords directly inside the consolidated **Settings** page.

### 3. Inline Infrastructure Config Uploader
- Choose cloud provider environment context (AWS, GCP, Azure).
- Upload and parse Terraform State files, Draw.io XML schemas, or Visio VSDX diagrams inline directly inside a project's Architecture tab to sync architecture overviews and security recommendation blocks.

### 4. Unified Decision & Task Logs
- Log architectural pivots, alternatives considered, and task milestones within each project.
- Synchronization rules ensure deleting notes deletes them instantly from both the workspace and project views.

---

## 📁 Folder Structure

- `backend/`: Python/Flask server managing APIs, database schemas, and file parsing.
- `frontend/`: Next.js 14 (App Router) interface styled with modern custom theme colors (`#49769F` brand blue).
- `storage/`: Local storage folder containing the SQLite database and parsed uploads.

---

## ⚙️ Local Development Setup

### 1. Requirements
- Python 3.11 or newer (Python 3.12 recommended)
- Node.js 20 LTS

### 2. Configure Environment Files
Create backend config in `backend/.env`:
```text
FLASK_ENV=development
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/coex.db
```

Create frontend config in `frontend/.env.local`:
```text
NEXT_PUBLIC_API_URL=http://localhost:5001/api
PORT=3000
```

### 3. Install Dependencies & Launch
Run the setup script to initialize virtual environments and dependencies:
```bash
./setup.sh
```

Start backend and frontend servers concurrently:
```bash
bash start.sh
```

- **Frontend Interface**: [http://localhost:3000](http://localhost:3000)
- **Backend API URL**: [http://localhost:5001/api](http://localhost:5001/api)
- **Backend API Ping**: [http://localhost:5001/api/ping](http://localhost:5001/api/ping)

---

## 🚀 Final Command Summary

### Local macOS development
```bash
git clone <repo-url> CoeX
cd CoeX
./setup.sh
bash start.sh
```

### Ubuntu server production
```bash
git clone <repo-url> CoeX
cd CoeX
./setup.sh
```

Then use systemd service controls:
```bash
sudo systemctl status coex-backend.service coex-frontend.service
sudo systemctl restart coex-backend.service coex-frontend.service
```

### Deployment updates on Ubuntu
```bash
cd /var/www/coex
sudo ./scripts/deploy.sh
```

### Useful local helpers
- `bash start.sh` — start frontend + backend together for local development
- `./scripts/rebuild_and_restart.sh` — rebuild and restart local frontend/backend with logs
- `./scripts/start-backend.sh --port 8082` — run backend only on a custom port
