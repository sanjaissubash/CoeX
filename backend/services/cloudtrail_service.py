"""CloudTrail log loading, filtering, risk-scoring and CSV export.

Two source types share one normalized output:
  - "local_folder": reads *.json / *.json.gz CloudTrail files off disk (real S3
    delivery layout supported, i.e. nested AWSLogs/.../*.json.gz).
  - "s3": the project has read-only access to the trail's S3 bucket. Events are
    fetched live, but ONLY for the requested date range — CloudTrail buckets can
    hold years of history, so we never list/scan the whole bucket. Each day in
    the range maps to one S3 prefix (AWSLogs/<account>/CloudTrail/<region>/Y/M/D/),
    so a 7-day query touches at most 7 prefixes per region instead of the entire
    bucket.

Because both paths key off the real CloudTrail field names, code written against
one works unchanged against the other.
"""
import csv
import gzip
import io
import json
import os
from datetime import date, datetime, timedelta

# Security-group related event names (ec2.amazonaws.com)
SG_EVENTS = {
    "AuthorizeSecurityGroupIngress",
    "AuthorizeSecurityGroupEgress",
    "RevokeSecurityGroupIngress",
    "RevokeSecurityGroupEgress",
    "ModifySecurityGroupRules",
    "CreateSecurityGroup",
    "DeleteSecurityGroup",
}

# Ports considered sensitive if exposed to the world
SENSITIVE_PORTS = {22: "SSH", 3389: "RDP", 3306: "MySQL", 5432: "PostgreSQL",
                   6379: "Redis", 27017: "MongoDB", 1433: "MSSQL", 9200: "Elasticsearch"}

DEFAULT_RANGE_DAYS = 7  # used when no date range is supplied for an S3 source
MAX_RANGE_DAYS = 31     # hard cap so a query can't trigger a huge S3 scan


class DateRangeError(ValueError):
    pass


def resolve_date_range(date_from=None, date_to=None, today=None):
    """Parse/validate a "YYYY-MM-DD" date range, capped at MAX_RANGE_DAYS.

    Missing both bounds defaults to the last DEFAULT_RANGE_DAYS days ending today.
    Returns (date_from: date, date_to: date, was_defaulted: bool).
    """
    today = today or datetime.utcnow().date()

    was_defaulted = not date_from and not date_to
    d_to = _parse_date(date_to) if date_to else today
    d_from = _parse_date(date_from) if date_from else (d_to - timedelta(days=DEFAULT_RANGE_DAYS - 1))

    if d_from > d_to:
        d_from, d_to = d_to, d_from

    span = (d_to - d_from).days + 1
    if span > MAX_RANGE_DAYS:
        raise DateRangeError(
            f"Date range too wide ({span} days). Narrow it to {MAX_RANGE_DAYS} days or fewer."
        )

    return d_from, d_to, was_defaulted


def _parse_date(s):
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except Exception:
        raise DateRangeError(f"Invalid date '{s}', expected YYYY-MM-DD")


def _daterange(d_from, d_to):
    d = d_from
    while d <= d_to:
        yield d
        d += timedelta(days=1)


# --- Loading -----------------------------------------------------------------

def load_events(source, session=None, date_from=None, date_to=None):
    """Load and normalize events for a CloudTrailSource-like object.

    `source` exposes `.source_type`, `.location`, `.account_id`, `.regions`.
    For source_type == "s3", `session` (a boto3.Session) is required and the
    date range is resolved/capped via resolve_date_range (defaults to the last
    7 days if not given). For "local_folder", the date range is optional and
    only used to filter the (already cheap to load) local dataset.

    Returns (events, meta) where meta describes the range actually used.
    """
    meta = {"date_from": None, "date_to": None, "date_range_defaulted": False}

    if source.source_type == "local_folder":
        raw = _load_local_folder(source.location)
        events = [_normalize(r) for r in raw]
        if date_from or date_to:
            d_from, d_to, defaulted = resolve_date_range(date_from, date_to)
            events = [e for e in events if _in_range(e.get("event_time"), d_from, d_to)]
            meta.update(date_from=d_from.isoformat(), date_to=d_to.isoformat(), date_range_defaulted=defaulted)
    elif source.source_type == "s3":
        if session is None:
            raise ValueError("An AWS session is required to read an S3 CloudTrail source")
        d_from, d_to, defaulted = resolve_date_range(date_from, date_to)
        raw = _load_s3(source, session, d_from, d_to)
        events = [_normalize(r) for r in raw]
        meta.update(date_from=d_from.isoformat(), date_to=d_to.isoformat(), date_range_defaulted=defaulted)
    else:
        raise ValueError(f"Unsupported source_type: {source.source_type}")

    events.sort(key=lambda e: e.get("event_time") or "", reverse=True)
    return events, meta


def _in_range(event_time, d_from, d_to):
    if not event_time:
        return False
    try:
        d = datetime.strptime(event_time[:10], "%Y-%m-%d").date()
    except Exception:
        return False
    return d_from <= d <= d_to


def _load_local_folder(folder):
    """Recursively read *.json / *.json.gz CloudTrail files from a folder."""
    records = []
    if not folder or not os.path.isdir(folder):
        return records

    for root, _dirs, files in os.walk(folder):
        for fn in sorted(files):
            path = os.path.join(root, fn)
            try:
                if fn.endswith(".json.gz"):
                    with gzip.open(path, "rt", encoding="utf-8") as f:
                        data = json.load(f)
                elif fn.endswith(".json"):
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                else:
                    continue
                records.extend(data.get("Records", []) if isinstance(data, dict) else [])
            except Exception as e:
                print(f"CloudTrail: failed to read {path}: {e}")
    return records


def parse_s3_location(location):
    """Split "s3://bucket/optional/prefix" into (bucket, base_prefix)."""
    loc = (location or "").strip()
    if loc.startswith("s3://"):
        loc = loc[len("s3://"):]
    loc = loc.strip("/")
    if "/" in loc:
        bucket, prefix = loc.split("/", 1)
    else:
        bucket, prefix = loc, ""
    return bucket, prefix


def _load_s3(source, session, d_from, d_to):
    """Fetch only the S3 objects for the requested date range.

    CloudTrail's S3 delivery layout is date-partitioned:
      [prefix/]AWSLogs/<account_id>/CloudTrail/<region>/<yyyy>/<mm>/<dd>/*.json.gz
    so each day in the range maps to one exact prefix per region — no bucket-wide
    listing is ever performed, however large the bucket's total history is.
    """
    if not source.account_id:
        raise ValueError("account_id is required to build the CloudTrail S3 key path")

    bucket, base_prefix = parse_s3_location(source.location)
    if not bucket:
        raise ValueError("A valid s3://bucket[/prefix] location is required")

    regions = [r.strip() for r in (source.regions or "").split(",") if r.strip()] or ["us-east-1"]

    s3 = session.client("s3")
    records = []

    for day in _daterange(d_from, d_to):
        for region in regions:
            prefix = "/".join(filter(None, [
                base_prefix, "AWSLogs", source.account_id, "CloudTrail", region,
                f"{day.year:04d}", f"{day.month:02d}", f"{day.day:02d}", "",
            ]))
            paginator = s3.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    if not (key.endswith(".json.gz") or key.endswith(".json")):
                        continue
                    body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
                    data = json.loads(gzip.decompress(body)) if key.endswith(".gz") else json.loads(body)
                    records.extend(data.get("Records", []) if isinstance(data, dict) else [])

    return records


def _normalize(rec):
    """Flatten a raw CloudTrail record into a UI/CSV-friendly dict + risk tag."""
    identity = rec.get("userIdentity", {}) or {}
    username = identity.get("userName")
    if not username:
        # AssumedRole / Root fall back to the role/session name or type
        sess = identity.get("sessionContext", {}).get("sessionIssuer", {})
        username = sess.get("userName") or identity.get("type") or "unknown"

    resource = _derive_resource(rec)
    risk, risk_reason = _score_risk(rec)

    return {
        "event_id": rec.get("eventID"),
        "event_time": rec.get("eventTime"),
        "event_name": rec.get("eventName"),
        "event_source": rec.get("eventSource"),
        "aws_region": rec.get("awsRegion"),
        "username": username,
        "user_type": identity.get("type"),
        "source_ip": rec.get("sourceIPAddress"),
        "resource": resource,
        "read_only": rec.get("readOnly", False),
        "error_code": rec.get("errorCode"),
        "risk": risk,
        "risk_reason": risk_reason,
        "raw": rec,
    }


def _derive_resource(rec):
    req = rec.get("requestParameters") or {}
    if "bucketName" in req:
        return f"s3://{req['bucketName']}"
    if "groupId" in req:
        return req["groupId"]
    if "userName" in req:
        return f"iam:user/{req['userName']}"
    if rec.get("eventName") == "ConsoleLogin":
        return "console"
    return "-"


def _score_risk(rec):
    """Return (risk_level, reason). Heuristic, tuned for the demo dataset."""
    name = rec.get("eventName", "")
    req = rec.get("requestParameters") or {}

    if rec.get("errorCode"):
        return "LOW", f"Denied/failed API call ({rec.get('errorCode')})"

    # World-open security group rules
    if name in ("AuthorizeSecurityGroupIngress", "AuthorizeSecurityGroupEgress"):
        for perm in (req.get("ipPermissions", {}) or {}).get("items", []):
            cidrs = [r.get("cidrIp") for r in (perm.get("ipRanges", {}) or {}).get("items", [])]
            if "0.0.0.0/0" in cidrs:
                port = perm.get("fromPort")
                if port in SENSITIVE_PORTS:
                    return "CRITICAL", f"{SENSITIVE_PORTS[port]} (port {port}) opened to the entire internet (0.0.0.0/0)"
                return "HIGH", f"Port {port} opened to the entire internet (0.0.0.0/0)"
        return "MEDIUM", "Inbound security-group rule added"

    if name in ("RevokeSecurityGroupIngress", "RevokeSecurityGroupEgress"):
        return "INFORMATIONAL", "Security-group rule removed (hardening / cleanup)"

    # Public S3 exposure
    if name == "PutBucketPolicy":
        policy = req.get("bucketPolicy", {})
        stmts = policy.get("Statement", []) if isinstance(policy, dict) else []
        for s in stmts:
            if s.get("Principal") == "*" or s.get("Principal") == {"AWS": "*"}:
                return "CRITICAL", "Bucket policy grants access to everyone (Principal: *)"
        return "MEDIUM", "Bucket policy changed"

    if name == "PutPublicAccessBlock":
        cfg = req.get("PublicAccessBlockConfiguration", {}) or {}
        if any(v is False for v in cfg.values()):
            return "HIGH", "S3 Public Access Block weakened (public exposure possible)"
        return "INFORMATIONAL", "S3 Public Access Block set (hardening)"

    if name == "PutBucketAcl":
        return "MEDIUM", "Bucket ACL changed"

    # IAM / auth signals
    if name == "ConsoleLogin" and (rec.get("userIdentity", {}) or {}).get("type") == "Root":
        return "HIGH", "Root account console login (should be rare and MFA-protected)"
    if name == "CreateAccessKey":
        return "MEDIUM", "New long-lived access key created"
    if name == "AttachUserPolicy":
        arn = req.get("policyArn", "")
        if "FullAccess" in arn or "Administrator" in arn:
            return "MEDIUM", "Broad managed policy attached to a user"
        return "LOW", "IAM policy attached to a user"

    if rec.get("readOnly"):
        return "INFORMATIONAL", "Read-only API call"
    return "INFORMATIONAL", "Standard management event"


# --- Filtering -------------------------------------------------------------

_RISK_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFORMATIONAL": 4}


def filter_events(events, event_names=None, event_sources=None, username=None,
                  keywords=None, risky_only=False, include_readonly=True):
    """Apply an intent filter to normalized events. All args are optional."""
    event_names = set(n for n in (event_names or []))
    event_sources = set(s for s in (event_sources or []))
    keywords = [k.lower() for k in (keywords or []) if k]

    out = []
    for e in events:
        if event_names and e["event_name"] not in event_names:
            continue
        if event_sources and e["event_source"] not in event_sources:
            continue
        if username and (e["username"] or "").lower() != username.lower():
            continue
        if risky_only and e["risk"] in ("INFORMATIONAL", "LOW"):
            continue
        if not include_readonly and e.get("read_only"):
            continue
        if keywords:
            blob = json.dumps(e, default=str).lower()
            if not any(k in blob for k in keywords):
                continue
        out.append(e)

    out.sort(key=lambda e: (_RISK_ORDER.get(e["risk"], 9), e.get("event_time") or ""))
    return out


def distinct_usernames(events):
    return sorted({e["username"] for e in events if e.get("username")})


def distinct_event_names(events):
    return sorted({e["event_name"] for e in events if e.get("event_name")})


# --- CSV -------------------------------------------------------------------

CSV_COLUMNS = ["event_time", "event_name", "event_source", "username", "user_type",
               "source_ip", "aws_region", "resource", "risk", "risk_reason",
               "error_code", "event_id"]


def events_to_csv(events):
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for e in events:
        writer.writerow({k: e.get(k, "") for k in CSV_COLUMNS})
    return buf.getvalue()
