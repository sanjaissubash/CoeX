#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOGDIR="/tmp/productos-dev-logs"
mkdir -p "$LOGDIR"

# Ensure backend is up
function wait_for() {
  local url=$1
  local tries=20
  local i=0
  until curl -sS "$url" >/dev/null 2>&1 || [ $i -ge $tries ]; do
    echo "waiting for $url... ($i)"
    sleep 0.5
    i=$((i+1))
  done
  if [ $i -ge $tries ]; then
    echo "timeout waiting for $url" >&2
    exit 2
  fi
}

wait_for http://127.0.0.1:8082/api/ping

echo "=== API ping OK ==="

# Create a family
FAM_JSON=$(curl -sS -X POST http://127.0.0.1:8082/api/families -H 'Content-Type: application/json' -d '{"name":"E2E Family"}')
echo "Created family: $FAM_JSON"

FAM_ID=$(echo "$FAM_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Family id: $FAM_ID"

# Create product
PROD_JSON=$(curl -sS -X POST http://127.0.0.1:8082/api/products -H 'Content-Type: application/json' -d "{\"name\":\"E2E Product\",\"family_id\":\"$FAM_ID\",\"description\":\"E2E created\"}")

echo "Created product: $PROD_JSON"

PROD_ID=$(echo "$PROD_JSON" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

echo "Product id: $PROD_ID"

# Check GET product
GET_PROD=$(curl -sS http://127.0.0.1:8082/api/products/$PROD_ID)
echo "GET product: $GET_PROD"

# Helper to assert JSON success and extract fields
function jq_extract() {
  local json="$1"; local path="$2"
  echo "$json" | python -c "import sys,json; print(json.load(sys.stdin)$path)"
}

echo "\n=== exercising resource flows ==="

# 1) Context blocks: create -> update -> get -> delete
CB_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/context-blocks -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"title\":\"E2E Block\",\"content\":\"block content\"}")
CB_BODY=$(echo "$CB_JSON" | sed -n '1,$p' | sed '$d')
CB_CODE=$(echo "$CB_JSON" | tail -n1)
echo "context-block create code=$CB_CODE body=$CB_BODY"
if [ "$CB_CODE" != "201" ]; then echo "Context block create failed" >&2; exit 3; fi
CB_ID=$(echo "$CB_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

UPD_CB=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/context-blocks/$CB_ID -H 'Content-Type: application/json' -d "{\"title\":\"E2E Block Updated\"}")
UPD_CB_BODY=$(echo "$UPD_CB" | sed -n '1,$p' | sed '$d')
UPD_CB_CODE=$(echo "$UPD_CB" | tail -n1)
if [ "$UPD_CB_CODE" != "200" ]; then echo "Context block update failed" >&2; exit 3; fi

GET_CB=$(curl -sS -w '\n%{http_code}' http://127.0.0.1:8082/api/context-blocks/$CB_ID)
GET_CB_BODY=$(echo "$GET_CB" | sed -n '1,$p' | sed '$d')
GET_CB_CODE=$(echo "$GET_CB" | tail -n1)
if [ "$GET_CB_CODE" != "200" ]; then echo "Context block get failed" >&2; exit 3; fi

DEL_CB=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/context-blocks/$CB_ID)
DEL_CB_CODE=$(echo "$DEL_CB" | tail -n1)
if [ "$DEL_CB_CODE" != "200" ]; then echo "Context block delete failed" >&2; exit 3; fi

# 2) Notes: create -> update -> get -> delete
NOTE_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/notes -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"note_type\":\"general\",\"title\":\"E2E Note\",\"content\":\"note body\"}")
NOTE_BODY=$(echo "$NOTE_JSON" | sed -n '1,$p' | sed '$d')
NOTE_CODE=$(echo "$NOTE_JSON" | tail -n1)
if [ "$NOTE_CODE" != "201" ]; then echo "Note create failed" >&2; exit 3; fi
NOTE_ID=$(echo "$NOTE_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

NOTE_UPD=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/notes/$NOTE_ID -H 'Content-Type: application/json' -d '{"title":"E2E Note Updated"}')
NOTE_UPD_CODE=$(echo "$NOTE_UPD" | tail -n1)
if [ "$NOTE_UPD_CODE" != "200" ]; then echo "Note update failed" >&2; exit 3; fi

NOTE_DEL=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/notes/$NOTE_ID)
NOTE_DEL_CODE=$(echo "$NOTE_DEL" | tail -n1)
if [ "$NOTE_DEL_CODE" != "200" ]; then echo "Note delete failed" >&2; exit 3; fi

# 3) Prompts: create -> use -> update -> delete
PROMPT_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/prompts -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"name\":\"E2E Prompt\",\"prompt_text\":\"Say hi\"}")
PROMPT_BODY=$(echo "$PROMPT_JSON" | sed -n '1,$p' | sed '$d')
PROMPT_CODE=$(echo "$PROMPT_JSON" | tail -n1)
if [ "$PROMPT_CODE" != "201" ]; then echo "Prompt create failed" >&2; exit 3; fi
PROMPT_ID=$(echo "$PROMPT_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

PROMPT_USE=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/prompts/$PROMPT_ID/use)
PROMPT_USE_CODE=$(echo "$PROMPT_USE" | tail -n1)
if [ "$PROMPT_USE_CODE" != "200" ]; then echo "Prompt use failed" >&2; exit 3; fi

PROMPT_UPD=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/prompts/$PROMPT_ID -H 'Content-Type: application/json' -d '{"name":"E2E Prompt Updated"}')
PROMPT_UPD_CODE=$(echo "$PROMPT_UPD" | tail -n1)
if [ "$PROMPT_UPD_CODE" != "200" ]; then echo "Prompt update failed" >&2; exit 3; fi

PROMPT_DEL=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/prompts/$PROMPT_ID)
PROMPT_DEL_CODE=$(echo "$PROMPT_DEL" | tail -n1)
if [ "$PROMPT_DEL_CODE" != "200" ]; then echo "Prompt delete failed" >&2; exit 3; fi

# 4) Sessions: create -> update -> get -> delete
SESSION_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/sessions -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"goal\":\"E2E goal\"}")
SESSION_BODY=$(echo "$SESSION_JSON" | sed -n '1,$p' | sed '$d')
SESSION_CODE=$(echo "$SESSION_JSON" | tail -n1)
if [ "$SESSION_CODE" != "201" ]; then echo "Session create failed" >&2; exit 3; fi
SESSION_ID=$(echo "$SESSION_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

SESSION_UPD=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/sessions/$SESSION_ID -H 'Content-Type: application/json' -d '{"summary":"E2E summary"}')
SESSION_UPD_CODE=$(echo "$SESSION_UPD" | tail -n1)
if [ "$SESSION_UPD_CODE" != "200" ]; then echo "Session update failed" >&2; exit 3; fi

SESSION_GET=$(curl -sS -w '\n%{http_code}' http://127.0.0.1:8082/api/sessions/$SESSION_ID)
SESSION_GET_CODE=$(echo "$SESSION_GET" | tail -n1)
if [ "$SESSION_GET_CODE" != "200" ]; then echo "Session get failed" >&2; exit 3; fi

SESSION_DEL=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/sessions/$SESSION_ID)
SESSION_DEL_CODE=$(echo "$SESSION_DEL" | tail -n1)
if [ "$SESSION_DEL_CODE" != "200" ]; then echo "Session delete failed" >&2; exit 3; fi

# 5) Decisions: create -> update -> get -> delete
DEC_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/decisions -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"title\":\"E2E Decision\"}")
DEC_BODY=$(echo "$DEC_JSON" | sed -n '1,$p' | sed '$d')
DEC_CODE=$(echo "$DEC_JSON" | tail -n1)
if [ "$DEC_CODE" != "201" ]; then echo "Decision create failed" >&2; exit 3; fi
DEC_ID=$(echo "$DEC_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

DEC_UPD=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/decisions/$DEC_ID -H 'Content-Type: application/json' -d '{"title":"E2E Decision Updated"}')
DEC_UPD_CODE=$(echo "$DEC_UPD" | tail -n1)
if [ "$DEC_UPD_CODE" != "200" ]; then echo "Decision update failed" >&2; exit 3; fi

DEC_GET=$(curl -sS -w '\n%{http_code}' http://127.0.0.1:8082/api/decisions/$DEC_ID)
DEC_GET_CODE=$(echo "$DEC_GET" | tail -n1)
if [ "$DEC_GET_CODE" != "200" ]; then echo "Decision get failed" >&2; exit 3; fi

DEC_DEL=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/decisions/$DEC_ID)
DEC_DEL_CODE=$(echo "$DEC_DEL" | tail -n1)
if [ "$DEC_DEL_CODE" != "200" ]; then echo "Decision delete failed" >&2; exit 3; fi

# 6) Research: create -> update -> get -> delete
RE_JSON=$(curl -sS -w '\n%{http_code}' -X POST http://127.0.0.1:8082/api/research -H 'Content-Type: application/json' -d "{\"product_id\":\"$PROD_ID\",\"title\":\"E2E Research\",\"content\":\"some content\"}")
RE_BODY=$(echo "$RE_JSON" | sed -n '1,$p' | sed '$d')
RE_CODE=$(echo "$RE_JSON" | tail -n1)
if [ "$RE_CODE" != "201" ]; then echo "Research create failed" >&2; exit 3; fi
RE_ID=$(echo "$RE_BODY" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

RE_UPD=$(curl -sS -w '\n%{http_code}' -X PUT http://127.0.0.1:8082/api/research/$RE_ID -H 'Content-Type: application/json' -d '{"title":"E2E Research Updated"}')
RE_UPD_CODE=$(echo "$RE_UPD" | tail -n1)
if [ "$RE_UPD_CODE" != "200" ]; then echo "Research update failed" >&2; exit 3; fi

RE_GET=$(curl -sS -w '\n%{http_code}' http://127.0.0.1:8082/api/research/$RE_ID)
RE_GET_CODE=$(echo "$RE_GET" | tail -n1)
if [ "$RE_GET_CODE" != "200" ]; then echo "Research get failed" >&2; exit 3; fi

RE_DEL=$(curl -sS -w '\n%{http_code}' -X DELETE http://127.0.0.1:8082/api/research/$RE_ID)
RE_DEL_CODE=$(echo "$RE_DEL" | tail -n1)
if [ "$RE_DEL_CODE" != "200" ]; then echo "Research delete failed" >&2; exit 3; fi

# 7) Templates: GET only
TEMPLATES=$(curl -sS -w '\n%{http_code}' http://127.0.0.1:8082/api/templates)
TEMPLATES_CODE=$(echo "$TEMPLATES" | tail -n1)
if [ "$TEMPLATES_CODE" != "200" ]; then echo "Templates GET failed" >&2; exit 3; fi

echo "All extended resource flows passed."

# Quick frontend check (root)
if curl -sS http://localhost:3000/ >/dev/null 2>&1; then
  echo "Frontend root responded OK"
else
  echo "Frontend root did not respond (check /tmp/productos-dev-logs/next.log)"
fi

# Summarize
echo "=== E2E smoke finished ==="

echo "Tip: tail logs at /tmp/productos-dev-logs to see more details"
