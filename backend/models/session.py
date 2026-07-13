from backend.database import db
from datetime import datetime
import uuid

class Session(db.Model):
    __tablename__ = "sessions"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    ai_tool = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    outcome = db.Column(db.Text)
    next_steps = db.Column(db.Text)
    full_output = db.Column(db.Text)
    tags = db.Column(db.JSON, default=list)
    session_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ai_metadata = db.Column(db.JSON)
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "ai_tool": self.ai_tool,
            "goal": self.goal,
            "summary": self.summary,
            "outcome": self.outcome,
            "next_steps": self.next_steps,
            "full_output": self.full_output,
            "tags": self.tags,
            "session_date": self.session_date.isoformat(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
