from datetime import datetime
from backend.database import db
import uuid


class CloudTrailRuleMatch(db.Model):
    """Dedup ledger: one row per (rule, CloudTrail event) that has already
    produced a task. The scheduler and manual "Check Now" both re-scan the
    same rolling date window on every run, so this table is what stops the
    same event from creating a duplicate task on the next tick.
    """
    __tablename__ = "cloudtrail_rule_matches"
    __table_args__ = (
        db.UniqueConstraint("rule_id", "event_id", name="uq_rule_event"),
        {"extend_existing": True},
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id = db.Column(db.String(36), db.ForeignKey("cloudtrail_watch_rules.id"), nullable=False)
    event_id = db.Column(db.String(512), nullable=False)  # CloudTrail eventID
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"))
    matched_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "rule_id": self.rule_id,
            "event_id": self.event_id,
            "task_id": self.task_id,
            "matched_at": self.matched_at.isoformat() if self.matched_at else None,
        }
