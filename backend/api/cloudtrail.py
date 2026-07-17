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

from botocore.exceptions import ClientError, NoCredentialsError
from flask import Response, jsonify, request

from backend.api import api_bp
from backend.database import db
from backend.models import Project, Task
from backend.models.cloudtrail_source import CloudTrailSource
from backend.models.cloudtrail_task_link import CloudTrailTaskLink
from backend.models.cloudtrail_watch_rule import CloudTrailWatchRule
from backend.models.compliance_account import ComplianceAccount
from backend.services import cloudtrail_service as cts
from backend.services import ollama_service as ai
from backend.services.activity_service import ActivityService

# Bundled 7-day sample dataset (schema-accurate CloudTrail logs)
DEMO_LOCATION = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "storage", "cloudtrail", "demo",
)


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
    compliance_account_id = (body.get("compliance_account_id") or "").strip() or None

    if not name or not location:
        return jsonify({"success": False, "error": "name and location are required"}), 400

    if source_type == "s3":
        if not compliance_account_id:
            return jsonify({"success": False, "error": "compliance_account_id is required for an S3 source — "
                                                        "connect (or pick) an AWS account for this project first"}), 400
        account = ComplianceAccount.query.filter_by(id=compliance_account_id, project_id=project_id).first()
        if not account:
            return jsonify({"success": False, "error": "Account not found for this project"}), 404
        bucket, _prefix = cts.parse_s3_location(location)
        if not bucket:
            return jsonify({"success": False, "error": "location must be s3://bucket[/prefix]"}), 400

    source = CloudTrailSource(
        project_id=project_id,
        name=name,
        source_type=source_type,
        location=location,
        compliance_account_id=compliance_account_id if source_type == "s3" else None,
        regions=body.get("regions", "us-east-1"),
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

    session, s3_account_id = None, None
    if source.source_type == "s3":
        account = ComplianceAccount.query.get(source.compliance_account_id) if source.compliance_account_id else None
        try:
            session, s3_account_id = cts.resolve_s3_connection(source, account)
        except (NoCredentialsError, ClientError, ValueError) as e:
            raise RuntimeError(f"AWS connection failed: {e}") from e

    try:
        events, meta = cts.load_events(
            source, session=session, date_from=date_from, date_to=date_to, s3_account_id=s3_account_id
        )
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
    source_id = body.get("source_id")

    if not event:
        return jsonify({"success": False, "error": "event is required"}), 400
    if not source_id:
        return jsonify({"success": False, "error": "source_id is required"}), 400
    CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()

    fields = cts.build_task_fields(
        event, note=f"Follow-up question / note:\n{note}" if note else None
    )
    task = Task(project_id=project_id, status="open", **fields)
    db.session.add(task)
    db.session.flush()

    db.session.add(CloudTrailTaskLink(
        project_id=project_id, source_id=source_id, task_id=task.id, event_id=event.get("event_id"),
    ))

    ActivityService.log_action(
        project_id=project_id,
        action="CREATED",
        entity_type="Task",
        entity_id=task.id,
        details={"source": "cloudtrail", "event_id": event.get("event_id")},
    )
    db.session.commit()
    return jsonify({"success": True, "data": task.to_dict()}), 201


@api_bp.route("/projects/<project_id>/cloudtrail/tasks", methods=["GET"])
def list_cloudtrail_tasks(project_id):
    """All tasks created from CloudTrail (manual clicks + auto watch-rule
    matches) for this project — kept out of the generic Planning list so
    they're easy to sort/triage in one place.
    """
    Project.query.get_or_404(project_id)
    source_id = request.args.get("source_id")
    status = request.args.get("status")
    origin = request.args.get("origin")  # "manual" | "auto"

    query = CloudTrailTaskLink.query.filter_by(project_id=project_id)
    if source_id:
        query = query.filter_by(source_id=source_id)
    if origin == "manual":
        query = query.filter(CloudTrailTaskLink.rule_id.is_(None))
    elif origin == "auto":
        query = query.filter(CloudTrailTaskLink.rule_id.isnot(None))

    links = query.order_by(CloudTrailTaskLink.created_at.desc()).all()

    rule_names = {
        r.id: r.name for r in CloudTrailWatchRule.query.filter(
            CloudTrailWatchRule.id.in_([l.rule_id for l in links if l.rule_id])
        ).all()
    } if links else {}

    out = []
    for link in links:
        task = Task.query.get(link.task_id)
        if not task:
            continue
        if status and task.status != status:
            continue
        item = link.to_dict()
        item["task"] = task.to_dict()
        item["rule_name"] = rule_names.get(link.rule_id)
        out.append(item)

    return jsonify({"success": True, "data": out})
