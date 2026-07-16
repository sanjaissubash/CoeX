"""CloudTrail watch rules: standing rules that automatically create a task
when a matching event appears, instead of a person asking a question and
clicking "Create Task" by hand.

Rules match on data already present on a CloudTrail event — an exact/substring
resource ID (e.g. "sg-0a1b2c3d"), specific event names, free-text keywords,
and/or "risky only" — not on resource tags, which would need an extra live AWS
lookup per match and wouldn't work against the offline demo dataset.

Evaluation is shared with the recurring background scheduler
(backend/scheduler.py -> backend/services/cloudtrail_watch_service.py), so a
rule behaves identically whether it fires automatically or via "Check Now".
"""
from flask import current_app, jsonify, request

from backend.api import api_bp
from backend.database import db
from backend.models import Project
from backend.models.cloudtrail_rule_match import CloudTrailRuleMatch
from backend.models.cloudtrail_source import CloudTrailSource
from backend.models.cloudtrail_watch_rule import CloudTrailWatchRule
from backend.services import cloudtrail_watch_service as watch_service
from backend.services.activity_service import ActivityService

_VALID_PRIORITIES = {"critical", "high", "medium", "low"}
MIN_CHECK_INTERVAL_SECONDS = 60  # can't be finer than the scheduler's own tick


def _parse_check_interval(body):
    """Returns (value, error). value is None only when the key is absent from
    the request body (caller should leave the field untouched / use the model
    default); an explicit null/blank means "reset to the default" and resolves
    to that default value rather than None.
    """
    if "check_interval_seconds" not in body:
        return None, None
    raw = body.get("check_interval_seconds")
    if raw is None or raw == "":
        from backend.services.cloudtrail_watch_service import DEFAULT_CHECK_INTERVAL_SECONDS
        return DEFAULT_CHECK_INTERVAL_SECONDS, None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None, "check_interval_seconds must be an integer number of seconds"
    if value < MIN_CHECK_INTERVAL_SECONDS:
        return None, f"check_interval_seconds must be at least {MIN_CHECK_INTERVAL_SECONDS}"
    return value, None


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules", methods=["GET"])
def list_watch_rules(project_id, source_id):
    Project.query.get_or_404(project_id)
    CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()
    rules = CloudTrailWatchRule.query.filter_by(source_id=source_id).order_by(
        CloudTrailWatchRule.created_at.desc()
    ).all()
    return jsonify({"success": True, "data": [r.to_dict() for r in rules]})


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules", methods=["POST"])
def create_watch_rule(project_id, source_id):
    Project.query.get_or_404(project_id)
    CloudTrailSource.query.filter_by(id=source_id, project_id=project_id).first_or_404()

    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    resource_id = (body.get("resource_id") or "").strip() or None
    event_names = (body.get("event_names") or "").strip() or None
    keywords = (body.get("keywords") or "").strip() or None
    risky_only = bool(body.get("risky_only", False))
    priority_override = (body.get("priority_override") or "").strip().lower() or None
    check_interval_seconds, interval_error = _parse_check_interval(body)

    if not name:
        return jsonify({"success": False, "error": "name is required"}), 400
    if not any([resource_id, event_names, keywords, risky_only]):
        return jsonify({"success": False, "error": "Specify at least one match criterion "
                                                    "(resource ID, event names, keywords, or risky-only)"}), 400
    if priority_override and priority_override not in _VALID_PRIORITIES:
        return jsonify({"success": False, "error": f"priority_override must be one of {sorted(_VALID_PRIORITIES)}"}), 400
    if interval_error:
        return jsonify({"success": False, "error": interval_error}), 400

    rule = CloudTrailWatchRule(
        project_id=project_id,
        source_id=source_id,
        name=name,
        resource_id=resource_id,
        event_names=event_names,
        keywords=keywords,
        risky_only=risky_only,
        priority_override=priority_override,
        **({"check_interval_seconds": check_interval_seconds} if check_interval_seconds is not None else {}),
    )
    db.session.add(rule)
    db.session.commit()

    ActivityService.log_action(
        project_id=project_id,
        action="CREATED",
        entity_type="CloudTrailWatchRule",
        entity_id=rule.id,
        details={"name": rule.name},
    )
    return jsonify({"success": True, "data": rule.to_dict()}), 201


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules/<rule_id>", methods=["PUT"])
def update_watch_rule(project_id, source_id, rule_id):
    Project.query.get_or_404(project_id)
    rule = CloudTrailWatchRule.query.filter_by(id=rule_id, source_id=source_id, project_id=project_id).first_or_404()

    body = request.get_json(silent=True) or {}
    if "name" in body:
        rule.name = (body.get("name") or "").strip() or rule.name
    if "resource_id" in body:
        rule.resource_id = (body.get("resource_id") or "").strip() or None
    if "event_names" in body:
        rule.event_names = (body.get("event_names") or "").strip() or None
    if "keywords" in body:
        rule.keywords = (body.get("keywords") or "").strip() or None
    if "risky_only" in body:
        rule.risky_only = bool(body.get("risky_only"))
    if "priority_override" in body:
        p = (body.get("priority_override") or "").strip().lower() or None
        if p and p not in _VALID_PRIORITIES:
            return jsonify({"success": False, "error": f"priority_override must be one of {sorted(_VALID_PRIORITIES)}"}), 400
        rule.priority_override = p
    if "enabled" in body:
        rule.enabled = bool(body.get("enabled"))
    if "check_interval_seconds" in body:
        value, error = _parse_check_interval(body)
        if error:
            return jsonify({"success": False, "error": error}), 400
        rule.check_interval_seconds = value

    if not any([rule.resource_id, rule.event_names, rule.keywords, rule.risky_only]):
        return jsonify({"success": False, "error": "Rule must keep at least one match criterion"}), 400

    db.session.commit()
    return jsonify({"success": True, "data": rule.to_dict()})


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules/<rule_id>", methods=["DELETE"])
def delete_watch_rule(project_id, source_id, rule_id):
    Project.query.get_or_404(project_id)
    rule = CloudTrailWatchRule.query.filter_by(id=rule_id, source_id=source_id, project_id=project_id).first_or_404()
    CloudTrailRuleMatch.query.filter_by(rule_id=rule.id).delete()
    # Tasks already created by this rule (and their CloudTrail-origin tag) survive the
    # rule's deletion — CloudTrailTaskLink.rule_id is intentionally left pointing at it
    # (rule_name lookups already tolerate a missing rule) so "origin: auto" stays correct.
    db.session.delete(rule)
    db.session.commit()
    return jsonify({"success": True, "message": "Watch rule removed"})


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules/<rule_id>/check-now", methods=["POST"])
def check_watch_rule_now(project_id, source_id, rule_id):
    """Evaluate this one rule immediately (same code path the scheduler uses)."""
    Project.query.get_or_404(project_id)
    rule = CloudTrailWatchRule.query.filter_by(id=rule_id, source_id=source_id, project_id=project_id).first_or_404()

    app = current_app._get_current_object()
    summary = watch_service.run_checks(app, rule_ids=[rule.id])

    db.session.refresh(rule)
    return jsonify({"success": True, "data": {"rule": rule.to_dict(), "summary": summary}})


@api_bp.route("/projects/<project_id>/cloudtrail/sources/<source_id>/watch-rules/<rule_id>/matches", methods=["GET"])
def list_watch_rule_matches(project_id, source_id, rule_id):
    """Recent tasks this rule has already auto-created, most recent first."""
    Project.query.get_or_404(project_id)
    CloudTrailWatchRule.query.filter_by(id=rule_id, source_id=source_id, project_id=project_id).first_or_404()
    matches = CloudTrailRuleMatch.query.filter_by(rule_id=rule_id).order_by(
        CloudTrailRuleMatch.matched_at.desc()
    ).limit(50).all()
    return jsonify({"success": True, "data": [m.to_dict() for m in matches]})
