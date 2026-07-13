# CoeX — Local-First AI Context & Memory Engine

CoeX is a local-first Product Knowledge & Context Management system. It serves as a permanent memory layer for digital products, keeping your data secure, isolated, and model-agnostic.

## Key Features

- **Local-First Storage**: 100% data privacy. All metadata is stored locally in SQLite (`storage/productos.db`) and user assets are saved directly to local folders.
- **AI Context Generator**: Compiles description, context blocks, tasks, decisions, sessions, and files into a single, copyable text packet to bootstrap new AI chats in seconds.
- **Context Leak Checker**: Scans generated context packages for sensitive tokens (API keys, secret keys, emails) and custom keywords before you share them with third-party cloud AIs.
- **Decision & Session Logs**: Keep a permanent record of technical pivots, rationale, alternatives considered, and AI work session outcomes.

---

## Folder Structure

- `backend/`: Python/Flask server managing APIs and database storage.
- `frontend/`: Next.js 14 (App Router) frontend interface.
- `storage/`: Local data root for SQLite databases and user assets.

---

## Local Development Setup

### 1. Requirements
- Python 3.11 or newer (Python 3.12 recommended)
- Node.js 20 LTS

### 2. Configure Environments
Create backend config in `backend/.env`:
```text
FLASK_ENV=development
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/productos.db
```

Create frontend config in `frontend/.env.local`:
```text
NEXT_PUBLIC_API_URL=http://localhost:5001/api
PORT=3000
```

### 3. Install Dependencies
Run the setup script to initialize environments and dependencies:
```bash
./setup.sh
```

---

## How to Run

Use the included helper script to start both services concurrently:
```bash
bash start.sh
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001/api](http://localhost:5001/api)
- **Backend Ping**: [http://localhost:5001/api/ping](http://localhost:5001/api/ping)
