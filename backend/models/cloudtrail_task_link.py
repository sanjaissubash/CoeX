from datetime import datetime
from backend.database import db
import uuid


class CloudTrailTaskLink(db.Model):
    """Marks a Task as originating from CloudTrail (manual "Create Task" click
    or an automatic watch rule match), so the CloudTrail tab can list its own
    tasks separately from the project's general Planning tasks.

    The underlying Task row is untouched/shared — this is purely a tag, kept
    in its own table (rather than a column on Task) so unrelated features
    never need to know CloudTrail exists.
    """
    __tablename__ = "cloudtrail_task_links"
    __table_args__ = (
        db.UniqueConstraint("task_id", name="uq_cloudtrail_task_link_task"),
        {"extend_existing": True},
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    source_id = db.Column(db.String(36), db.ForeignKey("cloudtrail_sources.id"), nullable=False)
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"), nullable=False)
    event_id = db.Column(db.String(512))  # CloudTrail eventID this task was created from
    rule_id = db.Column(db.String(36), db.ForeignKey("cloudtrail_watch_rules.id"))  # null = created manually
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "source_id": self.source_id,
            "task_id": self.task_id,
            "event_id": self.event_id,
            "rule_id": self.rule_id,
            "origin": "auto" if self.rule_id else "manual",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
