from backend.database import db
from datetime import datetime
import uuid

class Research(db.Model):
    __tablename__ = "research"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), default="general")
    source = db.Column(db.String(255))
    url = db.Column(db.String(500))
    content = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text)
    tags = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ai_metadata = db.Column(db.JSON)
    
    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "title": self.title,
            "category": self.category,
            "source": self.source,
            "url": self.url,
            "content": self.content,
            "notes": self.notes,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
