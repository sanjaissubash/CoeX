from backend.database import db
from datetime import datetime
import uuid

class Decision(db.Model):
    __tablename__ = "decisions"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rationale = db.Column(db.Text)
    impact = db.Column(db.Text)
    alternatives = db.Column(db.Text)
    status = db.Column(db.String(50), default="active")
    tags = db.Column(db.JSON, default=list)
    decision_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ai_metadata = db.Column(db.JSON)
    
    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "title": self.title,
            "description": self.description,
            "rationale": self.rationale,
            "impact": self.impact,
            "alternatives": self.alternatives,
            "status": self.status,
            "tags": self.tags,
            "decision_date": self.decision_date.isoformat(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
