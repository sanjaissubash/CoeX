"""Local AI (Ollama) integration for CloudTrail natural-language queries.

Two jobs:
  1. parse_intent(question)     -> a structured filter (what to fetch)
  2. summarize(question, events)-> a written, human-readable explanation

Ollama runs locally at OLLAMA_BASE_URL (default http://localhost:11434), keeping
CoeX local-first and model-agnostic. If Ollama is unavailable, both functions fall
back to deterministic rule-based logic so the workflow still works end-to-end.
"""
import json
import os

import requests

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "60"))


def is_available():
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def _generate(prompt, as_json=False):
    """Call Ollama /api/generate (non-streaming). Returns text or None on failure."""
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    if as_json:
        payload["format"] = "json"
    try:
        r = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama call failed: {e}")
        return None


# --- Intent parsing --------------------------------------------------------

def parse_intent(question, known_usernames=None, known_event_names=None):
    """Translate a natural-language question into a structured CloudTrail filter.

    Returns (filter_dict, used_ai: bool).
    filter_dict keys: event_names, event_sources, username, keywords, risky_only
    """
    known_usernames = known_usernames or []
    known_event_names = known_event_names or []

    if is_available():
        prompt = _INTENT_PROMPT.format(
            question=question,
            usernames=", ".join(known_usernames) or "(none)",
            event_names=", ".join(known_event_names[:60]) or "(none)",
        )
        raw = _generate(prompt, as_json=True)
        if raw:
            try:
                data = json.loads(raw)
                return _clean_intent(data, known_usernames), True
            except Exception as e:
                print(f"Ollama intent JSON parse failed: {e}; falling back to rules")

    return _rule_based_intent(question, known_usernames), False


def _clean_intent(data, known_usernames):
    out = {
        "event_names": data.get("event_names") or [],
        "event_sources": data.get("event_sources") or [],
        "username": data.get("username") or None,
        "keywords": data.get("keywords") or [],
        "risky_only": bool(data.get("risky_only", False)),
    }
    # Guard against the model inventing a username not present in the data
    if out["username"] and out["username"] not in known_usernames:
        match = next((u for u in known_usernames if u.lower() == str(out["username"]).lower()), None)
        out["username"] = match
    return out


def _rule_based_intent(question, known_usernames):
    """Deterministic keyword parser used when Ollama is unavailable."""
    q = question.lower()
    intent = {"event_names": [], "event_sources": [], "username": None,
              "keywords": [], "risky_only": False}

    if any(w in q for w in ["security group", "sg ", " sg", "firewall", "ingress", "port"]):
        intent["event_sources"].append("ec2.amazonaws.com")
        intent["event_names"] += [
            "AuthorizeSecurityGroupIngress", "RevokeSecurityGroupIngress",
            "AuthorizeSecurityGroupEgress", "RevokeSecurityGroupEgress",
            "ModifySecurityGroupRules", "CreateSecurityGroup",
        ]
    if any(w in q for w in ["s3", "bucket", "object", "storage"]):
        intent["event_sources"].append("s3.amazonaws.com")
    if any(w in q for w in ["iam", "access key", "policy", "permission", "login", "role"]):
        intent["event_sources"] += ["iam.amazonaws.com", "signin.amazonaws.com"]
    if any(w in q for w in ["risky", "suspicious", "dangerous", "exposed", "public", "critical", "insecure"]):
        intent["risky_only"] = True

    # Match a known username mentioned anywhere in the question
    tokens = set(q.replace("?", " ").replace(",", " ").split())
    for u in known_usernames:
        if u.lower() in tokens:
            intent["username"] = u
            break

    return intent


# --- Summarization ---------------------------------------------------------

def summarize(question, events):
    """Produce a written explanation of the matched events. Returns (text, used_ai)."""
    if not events:
        return "No CloudTrail events matched this question for the selected time range.", False

    compact = _compact_events(events)

    if is_available():
        prompt = _SUMMARY_PROMPT.format(
            question=question,
            count=len(events),
            events=json.dumps(compact, indent=2),
        )
        text = _generate(prompt)
        if text:
            return text, True

    return _rule_based_summary(question, events), False


def _compact_events(events, cap=40):
    """Trim events to the fields that matter, capped to protect the context window."""
    out = []
    for e in events[:cap]:
        out.append({
            "time": e.get("event_time"),
            "action": e.get("event_name"),
            "by": e.get("username"),
            "from_ip": e.get("source_ip"),
            "region": e.get("aws_region"),
            "resource": e.get("resource"),
            "risk": e.get("risk"),
            "why": e.get("risk_reason"),
            "error": e.get("error_code"),
        })
    return out


def _rule_based_summary(question, events):
    """Deterministic narrative when Ollama is unavailable."""
    by_risk = {}
    for e in events:
        by_risk.setdefault(e["risk"], []).append(e)

    lines = [f"Found {len(events)} matching CloudTrail event(s)."]
    for level in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]:
        items = by_risk.get(level)
        if not items:
            continue
        lines.append("")
        lines.append(f"{level} ({len(items)}):")
        for e in items[:10]:
            when = (e.get("event_time") or "")[:10]
            lines.append(
                f"  • {when} — {e['username']} ran {e['event_name']} on "
                f"{e['resource']} ({e['aws_region']}). {e['risk_reason']}."
            )
    return "\n".join(lines)


_INTENT_PROMPT = """You are a CloudTrail query planner. Convert the user's question into a JSON filter.

Question: "{question}"

Known usernames in the data: {usernames}
Known event names in the data: {event_names}

Return ONLY a JSON object with these keys:
- "event_names": array of exact CloudTrail event names to include (or [] for any)
- "event_sources": array like ["ec2.amazonaws.com","s3.amazonaws.com","iam.amazonaws.com"] (or [])
- "username": a single username from the known list if the question is about one person, else null
- "keywords": array of free-text terms to match (or [])
- "risky_only": true if the user asks about risky/suspicious/dangerous/public/exposed activity, else false

Do not invent usernames or event names that are not in the provided lists."""


_SUMMARY_PROMPT = """You are a cloud security analyst. Answer the user's question using ONLY the CloudTrail events provided. Be concise and factual. Do not invent data.

Question: "{question}"

{count} matching events (JSON):
{events}

Write a short briefing:
1. A one-sentence direct answer to the question.
2. Bullet points for the notable changes: what changed, who did it, when, and the security impact.
3. Flag anything risky (world-open ports, public buckets, root logins, denied calls) explicitly.
Keep it under 200 words."""
