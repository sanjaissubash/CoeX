"""CloudTrail review API.

Lets a project connect a CloudTrail log source — either a local folder of
CloudTrail JSON (demo/offline use) or read-only access to the trail's real S3
bucket — ask natural-language questions answered by a local Ollama model (with
rule-based fallback), download the matching events as CSV, and turn any event
into a project task for follow-up / change review.

For S3 sources, events are only ever fetched for the date range the user asks
about (defaulting to the last 7 days, capped at 31) — never a full-bucket scan.
"""
import os

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from flask import Response, jsonify, request

from backend.api import api_bp
from backend.database import db
from backend.models import Project, Task
from backend.models.cloudtrail_source import CloudTrailSource
from backend.services import cloudtrail_service as cts
from backend.services import ollama_service as ai
from backend.services.activity_service import ActivityService

# Bundled 7-day sample dataset (schema-accurate CloudTrail logs)
DEMO_LOCATION = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "storage", "cloudtrail", "demo",
)

_RISK_TO_PRIORITY = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "INFORMATIONAL": "low",
}


def _build_aws_session(source):
    """Build a boto3 Session for an S3 CloudTrail source (read-only use only)."""
    if source.connection_method == "cross_account_role":
        if not source.role_arn:
            raise ValueError("role_arn is required for the cross_account_role connection method")
        sts = boto3.client("sts")
        assume_params = {"RoleArn": source.role_arn, "RoleSessionName": "CoeXCloudTrailSession"}
        if source.external_id:
            assume_params["ExternalId"] = source.external_id
        assumed = sts.assume_role(**assume_params)
        creds = assumed["Credentials"]
        session = boto3.Session(
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
        )
    else:
        session = boto3.Session()

    # Fail fast with a clear error rather than a confusing downstream S3 error.
    session.client("sts").get_caller_identity()
    return session


@api_bp.route("/projects/<project_id>/cloudtrail/sources", methods=["GET"])
def list_cloudtrail_sources(project_id):
    Project.query.get_or_404(project_id)
    sources = CloudTrailSource.query.filter_by(project_id=project_id).all()
    return jsonify({"success": True, "data": [s.to_dict() for s in sources]})


@api_bp.route("/projects/<project_id>/cloudtrail/sources", methods=["POST"])
def create_cloudtrail_source(project_id):
    Project.query.get_or_404(project_id)
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    source_type = body.get("source_type", "local_folder")
    location = (body.get("location") or "").strip()
    account_id = (body.get("account_id") or "").strip()

    if not name or not location:
        return jsonify({"success": False, "error": "name and location are required"}), 400

    if source_type == "s3":
        if not account_id:
            return jsonify({"success": False, "error": "account_id is required for an S3 source "
                                                        "(used to build the AWSLogs/<account_id>/... key path)"}), 400
        bucket, _prefix = cts.parse_s3_location(location)
        if not bucket:
            return jsonify({"success": False, "error": "location must be s3://bucket[/prefix]"}), 400

    source = CloudTrailSource(
        project_id=project_id,
        name=name,
        source_type=source_type,
        location=location,
        account_id=account_id or None,
        regions=body.get("regions", "us-east-1"),
        connection_method=body.get("connection_method", "local_role"),
        role_arn=body.get("role_arn") if source_type == "s3" else None,
        external_id=body.get("external_id") if source_type == "s3" else None,
    )
    db.session.add(source)
    db.session.commit()

    ActivityService.log_action(
        project_id=project_id,
        action="CREATED",
        entity_type="CloudTrailSource",
        entity_id=source.id,
        details={"name": source.name, "source_type": source.source_type},
    )
    return jsonify({"success": True, "data": source.to_dict()}), 201


@api_bp.route("/projects/<project_id>/cloudtrail/sources/load-demo", methods=["POST"])
def load_demo_cloudtrail_source(project_id):
    """Convenience: register the bundled 7-day sample dataset as a source."""
    Project.query.get_or_404(project_id)
    if not os.path.isdir(DEMO_LOCATION):
        return jsonify({"success": False, "error": "Demo dataset not found on server"}), 404

    existing = CloudTrailSource.query.filter_by(
        project_id=project_id, location=DEMO_LOCATION
    ).first()
    if existing:
        return jsonify({"success": True, "data": existing.to_dict()})

    source = CloudTrailSource(
        project_id=project_id,
        name="Demo — 7-day sample",
        source_type="local_folder",
        location=DEMO_LOCATION,
        account_id="123456789012",
    )
    db.session.add(source)
    db.session.commit()
    return jsonify({"success": True, "data": source.to_dict()}), 201


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>", methods=["DELETE"])
def delete_cloudtrail_source(project_id, source_id):
    Project.query.get_or_404(project_id)
    source = CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()
    db.session.delete(source)
    db.session.commit()
    return jsonify({"success": True, "message": "CloudTrail source removed"})


def _load_events_for_request(source, body):
    """Shared: build a session if needed and load events for the requested range.

    Returns (events, meta) on success. Raises a (status_code, message) tuple
    wrapped in ValueError-like exceptions the caller turns into a JSON error.
    """
    date_from = body.get("date_from")
    date_to = body.get("date_to")

    session = None
    if source.source_type == "s3":
        try:
            session = _build_aws_session(source)
        except (NoCredentialsError, ClientError, ValueError) as e:
            raise RuntimeError(f"AWS connection failed: {e}") from e

    try:
        events, meta = cts.load_events(source, session=session, date_from=date_from, date_to=date_to)
    except cts.DateRangeError as e:
        raise ValueError(str(e)) from e
    except (ClientError, NoCredentialsError) as e:
        raise RuntimeError(f"Failed to read CloudTrail logs from S3: {e}") from e

    return events, meta


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/ask", methods=["POST"])
def ask_cloudtrail(project_id, source_id):
    """Answer a natural-language question over the source's CloudTrail logs.

    Body may include `date_from` / `date_to` (YYYY-MM-DD) to bound the fetch —
    required in spirit for S3 sources (defaults to the last 7 days if omitted).
    """
    Project.query.get_or_404(project_id)
    source = CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()

    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"success": False, "error": "question is required"}), 400

    try:
        events, range_meta = _load_events_for_request(source, body)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502

    if not events:
        return jsonify({"success": False,
                        "error": "No CloudTrail events found for the selected source/date range.",
                        "data": {"date_range": range_meta}}), 404

    # 1) Ollama (or rules) decides WHAT to fetch
    intent, intent_ai = ai.parse_intent(
        question,
        known_usernames=cts.distinct_usernames(events),
        known_event_names=cts.distinct_event_names(events),
    )

    # 2) Apply the filter deterministically
    matched = cts.filter_events(
        events,
        event_names=intent.get("event_names"),
        event_sources=intent.get("event_sources"),
        username=intent.get("username"),
        keywords=intent.get("keywords"),
        risky_only=intent.get("risky_only", False),
    )

    # 3) Ollama (or rules) writes the human-readable answer, grounded in the events
    summary, summary_ai = ai.summarize(question, matched)

    return jsonify({
        "success": True,
        "data": {
            "question": question,
            "intent": intent,
            "summary": summary,
            "events": matched,
            "csv": cts.events_to_csv(matched),
            "total_scanned": len(events),
            "match_count": len(matched),
            "date_from": range_meta["date_from"],
            "date_to": range_meta["date_to"],
            "date_range_defaulted": range_meta["date_range_defaulted"],
            "ai_used": bool(intent_ai or summary_ai),
            "ai_model": ai.OLLAMA_MODEL if (intent_ai or summary_ai) else None,
        },
    })


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/export.csv", methods=["POST"])
def export_cloudtrail_csv(project_id, source_id):
    """Return a downloadable CSV for a given date range + intent filter."""
    Project.query.get_or_404(project_id)
    source = CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()
    body = request.get_json(silent=True) or {}

    try:
        events, _range_meta = _load_events_for_request(source, body)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"success": False, "error": str(e)}), 502

    matched = cts.filter_events(
        events,
        event_names=body.get("event_names"),
        event_sources=body.get("event_sources"),
        username=body.get("username"),
        keywords=body.get("keywords"),
        risky_only=body.get("risky_only", False),
    )
    csv_text = cts.events_to_csv(matched)
    return Response(
        csv_text,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=cloudtrail_events.csv"},
    )


@api_bp.route("/projects/<project_id>/cloudtrail/create-task", methods=["POST"])
def create_task_from_event(project_id):
    """Turn a CloudTrail event into a project task (e.g. for change review)."""
    Project.query.get_or_404(project_id)
    body = request.get_json(silent=True) or {}
    event = body.get("event") or {}
    note = (body.get("note") or "").strip()

    if not event:
        return jsonify({"success": False, "error": "event is required"}), 400

    action = event.get("event_name", "activity")
    resource = event.get("resource", "-")
    when = (event.get("event_time") or "")[:19].replace("T", " ")
    priority = _RISK_TO_PRIORITY.get((event.get("risk") or "").upper(), "medium")

    description = (
        f"CHANGE REVIEW — CloudTrail event\n\n"
        f"Action: {action}\n"
        f"Performed by: {event.get('username')} ({event.get('user_type')})\n"
        f"When: {when} UTC\n"
        f"Source IP: {event.get('source_ip')}\n"
        f"Region: {event.get('aws_region')}\n"
        f"Resource: {resource}\n"
        f"Risk: {event.get('risk')} — {event.get('risk_reason')}\n"
        f"Event ID: {event.get('event_id')}\n"
    )
    if event.get("error_code"):
        description += f"Error: {event.get('error_code')}\n"
    if note:
        description += f"\nFollow-up question / note:\n{note}\n"

    task = Task(
        project_id=project_id,
        title=f"Review: {action} on {resource}",
        description=description,
        priority=priority,
        status="open",
    )
    db.session.add(task)
    db.session.flush()

    ActivityService.log_action(
        project_id=project_id,
        action="CREATED",
        entity_type="Task",
        entity_id=task.id,
        details={"source": "cloudtrail", "event_id": event.get("event_id")},
    )
    db.session.commit()
    return jsonify({"success": True, "data": task.to_dict()}), 201
