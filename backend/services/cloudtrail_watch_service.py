"""Evaluate CloudTrailWatchRule rules and auto-create tasks for new matches.

One code path serves both callers, so a rule behaves identically whether it
fires automatically (backend/scheduler.py, on an interval) or on demand (the
"Check Now" API action):

  run_checks(app, rule_ids=None) -> summary dict

The background scheduler still ticks globally every ~60s, but each rule has
its own `check_interval_seconds` (default 300s / 5 min) — on a scheduler tick,
a rule is only actually evaluated once that much time has passed since its
last_checked_at. "Check Now" always evaluates immediately, ignoring the
interval, since it's an explicit request. The interval is a floor, not a
guarantee: it can never be finer than however often the scheduler itself ticks.

Each evaluation re-scans a rolling date window (CLOUDTRAIL_WATCH_WINDOW_DAYS,
default 14 — comfortably covers the bundled 7-day demo dataset) rather than
tracking "since last check" state, so CloudTrailRuleMatch (a per rule+event
dedup ledger) is what prevents the same event from producing a duplicate task.
"""
import os
from datetime import datetime, timedelta

from backend.database import db
from backend.models import Task
from backend.models.cloudtrail_rule_match import CloudTrailRuleMatch
from backend.models.cloudtrail_source import CloudTrailSource
from backend.models.cloudtrail_task_link import CloudTrailTaskLink
from backend.models.cloudtrail_watch_rule import CloudTrailWatchRule
from backend.models.compliance_account import ComplianceAccount
from backend.services import cloudtrail_service as cts
from backend.services.activity_service import ActivityService

WATCH_WINDOW_DAYS = int(os.getenv("CLOUDTRAIL_WATCH_WINDOW_DAYS", "14"))
DEFAULT_CHECK_INTERVAL_SECONDS = 300


def _is_due(rule):
    if not rule.last_checked_at:
        return True
    interval = rule.check_interval_seconds or DEFAULT_CHECK_INTERVAL_SECONDS
    return (datetime.utcnow() - rule.last_checked_at).total_seconds() >= interval


def run_checks(app, rule_ids=None, respect_interval=None):
    """Evaluate enabled rules (optionally a specific subset) and create tasks
    for newly matched events. Wrapped in its own app context so it's safe to
    call from a background scheduler thread as well as from a request handler.

    respect_interval: when None (default), the per-rule interval is honored
    only for a "check everything" scheduler tick (rule_ids=None) — an explicit
    rule_ids list (i.e. "Check Now" on a specific rule) always runs immediately.
    Pass True/False to override this default explicitly.
    """
    if respect_interval is None:
        respect_interval = rule_ids is None

    with app.app_context():
        query = CloudTrailWatchRule.query.filter_by(enabled=True)
        if rule_ids:
            query = query.filter(CloudTrailWatchRule.id.in_(rule_ids))
        rules = query.all()

        events_by_source = {}  # source_id -> events list, so N rules on one source fetch once
        summary = {"rules_checked": 0, "rules_skipped_not_due": 0, "new_tasks": 0, "errors": []}

        for rule in rules:
            if respect_interval and not _is_due(rule):
                summary["rules_skipped_not_due"] += 1
                continue
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
        session, s3_account_id = None, None
        if source.source_type == "s3":
            account = ComplianceAccount.query.get(source.compliance_account_id) if source.compliance_account_id else None
            session, s3_account_id = cts.resolve_s3_connection(source, account)
        date_to = datetime.utcnow().date()
        date_from = date_to - timedelta(days=WATCH_WINDOW_DAYS - 1)
        events, _meta = cts.load_events(
            source, session=session,
            date_from=date_from.isoformat(), date_to=date_to.isoformat(),
            s3_account_id=s3_account_id,
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
        db.session.add(CloudTrailTaskLink(
            project_id=rule.project_id, source_id=rule.source_id, task_id=task.id,
            event_id=ev["event_id"], rule_id=rule.id,
        ))

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
