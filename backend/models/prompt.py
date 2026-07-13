from backend.database import db
from datetime import datetime
import uuid

class Prompt(db.Model):
    __tablename__ = "prompts"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"))
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100))
    prompt_text = db.Column(db.Text, nullable=False)
    ai_tool = db.Column(db.String(100))
    usage_count = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime)
    tags = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.name,
            "category": self.category,
            "prompt_text": self.prompt_text,
            "ai_tool": self.ai_tool,
            "usage_count": self.usage_count,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
