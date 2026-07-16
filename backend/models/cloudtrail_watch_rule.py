from datetime import datetime
from backend.database import db
import uuid


class CloudTrailWatchRule(db.Model):
    """A standing rule: "any CloudTrail event matching X on this source should
    automatically become a task." Evaluated on a recurring schedule (see
    backend/services/cloudtrail_watch_service.py) as well as on-demand via
    "Check Now". Matches only on data already present on the event (resource
    ID, event name, free-text keyword) — not on resource tags, which would
    require an extra live AWS lookup per match.
    """
    __tablename__ = "cloudtrail_watch_rules"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    source_id = db.Column(db.String(36), db.ForeignKey("cloudtrail_sources.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)

    # Match criteria — any combination; a rule must specify at least one.
    resource_id = db.Column(db.String(512))  # exact/substring match against the event's derived resource, e.g. "sg-0a1b2c3d"
    event_names = db.Column(db.Text)  # comma-separated exact CloudTrail event names
    keywords = db.Column(db.Text)  # comma-separated free-text terms
    risky_only = db.Column(db.Boolean, default=False)

    priority_override = db.Column(db.String(20))  # critical/high/medium/low; null = derive from the event's risk
    enabled = db.Column(db.Boolean, default=True)

    last_checked_at = db.Column(db.DateTime)
    last_match_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "source_id": self.source_id,
            "name": self.name,
            "resource_id": self.resource_id,
            "event_names": self.event_names,
            "keywords": self.keywords,
            "risky_only": self.risky_only,
            "priority_override": self.priority_override,
            "enabled": self.enabled,
            "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
            "last_match_count": self.last_match_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
