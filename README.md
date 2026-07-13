# FIFA World Cup 2026 · Prediction Club

A members-only World Cup prediction game. **Python/Flask JSON API** + **Next.js
(App Router) & Tailwind** frontend with a premium "Midnight & Gold" design and a
```markdown
# ProductOS — Product Operating System (Work in progress)

This repository previously contained a FIFA World Cup prediction app. That
legacy project has been archived and its artifacts moved to `storage/exports/`
and `docs/legacy/` for reference.

Current focus: implementing ProductOS — a local-first Product Knowledge &
Context Management system. The authoritative functional specification is in
`docs/ProductOS_Functional_Spec_v1.0.md`.

Quick links:

- Backend scaffold: `backend/` (Flask + SQLAlchemy)
- Frontend for ProductOS: `frontend/` (Next.js — in-progress)
- Storage root: `storage/` (families, products, uploads, exports)
- Product spec: `docs/ProductOS_Functional_Spec_v1.0.md`
- Legacy app backups: `storage/exports/legacy_*_backup_*.tar.gz`
- Legacy docs archived: `docs/legacy/`

How to run the backend (development)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -c "from backend.storage import ensure_storage_dirs; ensure_storage_dirs('storage')"
# Run app: (TODO) create app factory and runner — see backend/README or docs
```

Run backend locally (recommended)

This project uses a project-local virtual environment to isolate Python dependencies.

1. Create and activate the venv:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install requirements:

```bash
pip install -r requirements.txt
```

3. Start the backend on port 8082:

```bash
python -m backend.run --port 8082
```

The helper script `scripts/start-backend.sh` (added below) automates these steps.

See `docs/ProductOS_Functional_Spec_v1.0.md` for the implementation plan and
feature requirements. Development is ongoing; open a task/issue if you need
priority work.

```
./.venv313/bin/python run.py
