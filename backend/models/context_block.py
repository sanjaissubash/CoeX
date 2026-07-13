from backend.database import db
from datetime import datetime
import uuid

class ContextBlock(db.Model):
    __tablename__ = "context_blocks"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    block_type = db.Column(db.String(50))
    priority = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ai_metadata = db.Column(db.JSON)
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "title": self.title,
            "content": self.content,
            "block_type": self.block_type,
            "priority": self.priority,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
