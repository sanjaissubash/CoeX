This file lists files and directories that look legacy/duplicated or unrelated to the current 'productos' backend/frontend app.

I will NOT delete anything yet. This is a review list — tell me what to remove and I'll delete safely (with backups where appropriate).

Recommended safe removals / manual review:

1) Legacy `app/` package
- Path: `app/`
- Reason: This is the old legacy app (football/predictions) and the project now has `backend/` as the canonical API. The `app/` package currently raises ImportError in `app/__init__.py` and is not used by the `backend` runtime.
- Action: Remove if you do not need legacy football features. Keep only if you must keep legacy code for historical reasons.

2) Old venvs
- Paths: `.venv/`, `venv/` (and any top-level `venv` directories)
- Reason: multiple venvs cause confusion; you indicated a canonical `.venv_backend` exists. Keep `.venv_backend`, remove others.
- Action: Remove `./.venv/`, `./venv/` and any other venv directories except `.venv_backend`.

3) Duplicate model modules
- Paths: `backend/models/task.py`, `backend/models/milestone.py` (if still present)
- Reason: duplicates can cause SQLAlchemy metadata collisions. I removed duplicates earlier in code edits — ensure these files are gone.

4) Top-level `run.py` and other legacy entrypoints
- Path: `run.py` (top-level) — only keep if you still use legacy app entrypoint.
- Reason: We have `backend/run.py` as the canonical backend entrypoint. The top-level `run.py` invokes legacy `app` package.
- Action: Remove `run.py` if you want to keep only `backend/run.py` as canonical.

5) `legacy_app/` or other unexpected packages
- Search for `legacy*`, `app_old`, etc. Remove if unused.

6) Deploy-related config not used locally
- `deploy/` contains service files and deployment scripts; keep if you deploy from this repo, otherwise archive or remove.

7) Unused frontends
- There are both `frontend/` and `web/` directories in the repo. Verify which is active. The product UI appears under `frontend/` (Next.js). If `web/` is a duplicate or old, consider removing.

8) `.venv_backend` vs others
- Confirmed canonical venv exists: `.venv_backend/` — keep it, ignore/remove others.

Next steps I can take once you approve:
- Remove chosen items safely (move to `storage/exports/cleanup-YYYYMMDD/` as backup), then commit changes.
- Update `scripts/rebuild_and_restart.sh` further if you want more hardening.
- Run the rebuild & restart flow using `.venv_backend` and report any runtime errors.

If you want me to proceed with deletion, tell me which items from the list to remove. If you want a narrower list, say so and I’ll refine it.
