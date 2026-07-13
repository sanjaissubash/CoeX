from backend.database import db
from datetime import datetime
import uuid

class ProjectProgress(db.Model):
    __tablename__ = "project_progress"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False, unique=True)
    idea_progress = db.Column(db.String(50), default="not_started")
    research_progress = db.Column(db.String(50), default="not_started")
    planning_progress = db.Column(db.String(50), default="not_started")
    creating_progress = db.Column(db.String(50), default="not_started")
    testing_progress = db.Column(db.String(50), default="not_started")
    ready_to_sell_progress = db.Column(db.String(50), default="not_started")
    published_progress = db.Column(db.String(50), default="not_started")
    optimizing_progress = db.Column(db.String(50), default="not_started")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "idea_progress": self.idea_progress,
            "research_progress": self.research_progress,
            "planning_progress": self.planning_progress,
            "creating_progress": self.creating_progress,
            "testing_progress": self.testing_progress,
            "ready_to_sell_progress": self.ready_to_sell_progress,
            "published_progress": self.published_progress,
            "optimizing_progress": self.optimizing_progress,
            "updated_at": self.updated_at.isoformat(),
        }
