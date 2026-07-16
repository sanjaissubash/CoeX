"""Evaluate CloudTrailWatchRule rules and auto-create tasks for new matches.

One code path serves both callers, so a rule behaves identically whether it
fires automatically (backend/scheduler.py, on an interval) or on demand (the
"Check Now" API action):

  run_checks(app, rule_ids=None) -> summary dict

Each run re-scans a rolling date window (CLOUDTRAIL_WATCH_WINDOW_DAYS, default
14 — comfortably covers the bundled 7-day demo dataset) rather than tracking
"since last check" state, so CloudTrailRuleMatch (a per rule+event dedup
ledger) is what prevents the same event from producing a duplicate task on
the next tick.
"""
import os
from datetime import datetime, timedelta

from backend.database import db
from backend.models import Task
from backend.models.cloudtrail_rule_match import CloudTrailRuleMatch
from backend.models.cloudtrail_source import CloudTrailSource
from backend.models.cloudtrail_watch_rule import CloudTrailWatchRule
from backend.services import cloudtrail_service as cts
from backend.services.activity_service import ActivityService

WATCH_WINDOW_DAYS = int(os.getenv("CLOUDTRAIL_WATCH_WINDOW_DAYS", "14"))


def run_checks(app, rule_ids=None):
    """Evaluate enabled rules (optionally a specific subset) and create tasks
    for newly matched events. Wrapped in its own app context so it's safe to
    call from a background scheduler thread as well as from a request handler.
    """
    with app.app_context():
        query = CloudTrailWatchRule.query.filter_by(enabled=True)
        if rule_ids:
            query = query.filter(CloudTrailWatchRule.id.in_(rule_ids))
        rules = query.all()

        events_by_source = {}  # source_id -> events list, so N rules on one source fetch once
        summary = {"rules_checked": 0, "new_tasks": 0, "errors": []}

        for rule in rules:
            summary["rules_checked"] += 1
            try:
                new_count = _evaluate_rule(rule, events_by_source)
                summary["new_tasks"] += new_count
            except Exception as e:
                msg = f"Rule '{rule.name}' ({rule.id}) failed: {e}"
                print(f"CloudTrail watch: {msg}")
                summary["errors"].append(msg)

        return summary


def _evaluate_rule(rule, events_by_source):
    source = CloudTrailSource.query.get(rule.source_id)
    if not source:
        raise ValueError("source not found")

    if source.id not in events_by_source:
        session = cts.build_aws_session(source) if source.source_type == "s3" else None
        date_to = datetime.utcnow().date()
        date_from = date_to - timedelta(days=WATCH_WINDOW_DAYS - 1)
        events, _meta = cts.load_events(
            source, session=session,
            date_from=date_from.isoformat(), date_to=date_to.isoformat(),
        )
        events_by_source[source.id] = events

    matched = cts.filter_events(
        events_by_source[source.id],
        event_names=cts.parse_csv_list(rule.event_names),
        keywords=cts.parse_csv_list(rule.keywords),
        risky_only=rule.risky_only,
        resource_id=rule.resource_id,
    )

    new_count = 0
    for ev in matched:
        already = CloudTrailRuleMatch.query.filter_by(rule_id=rule.id, event_id=ev["event_id"]).first()
        if already:
            continue

        fields = cts.build_task_fields(
            ev,
            note=f'Auto-created by CloudTrail watch rule "{rule.name}".',
            priority_override=rule.priority_override,
            title_prefix="Auto-Review",
        )
        task = Task(project_id=rule.project_id, status="open", **fields)
        db.session.add(task)
        db.session.flush()

        db.session.add(CloudTrailRuleMatch(rule_id=rule.id, event_id=ev["event_id"], task_id=task.id))

        ActivityService.log_action(
            project_id=rule.project_id,
            action="CREATED",
            entity_type="Task",
            entity_id=task.id,
            details={"source": "cloudtrail_watch_rule", "rule_id": rule.id, "event_id": ev["event_id"]},
        )
        new_count += 1

    rule.last_checked_at = datetime.utcnow()
    rule.last_match_count = new_count
    db.session.commit()
    return new_count
