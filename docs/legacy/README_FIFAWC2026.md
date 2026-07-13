```markdown
# FIFA World Cup 2026 · Prediction Club (Legacy)

This document is an archival copy of the original README for the legacy FIFA
prediction project that previously lived in this repository. The legacy
prediction app has been archived and removed from the active workspace. See
`storage/exports/` for backups.

--- Original content below ---

```

```markdown
# FIFA World Cup 2026 · Prediction Club

A members-only World Cup prediction game. **Python/Flask JSON API** + **Next.js
(App Router) & Tailwind** frontend with a premium "Midnight & Gold" design and a
dark/light theme toggle.

## Architecture

```
FIFAWC2026/
  app/            Flask app — JSON API only (no templates), SQLite via SQLAlchemy
    api.py        all /api/* endpoints
    models.py     User / Match / Prediction / MvpPrediction
    utils/        scoring, world-cup data, football-data.org sync
  web/            Next.js 14 + Tailwind frontend (proxies /api -> Flask)
  run.py          Flask dev entrypoint (port 8082)
  config.py       Flask config (reads .env)
```

The browser only ever talks to the Next.js origin; `web/next.config.mjs`
proxies `/api/*` to Flask, so the Flask session cookie behaves as first-party.

... (truncated for brevity) ...

```

*** End Patch