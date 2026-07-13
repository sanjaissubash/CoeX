from backend.database import db
from datetime import datetime
import uuid

class Workspace(db.Model):
    __tablename__ = "workspaces"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    families = db.relationship("Family", backref="workspace", lazy=True, cascade="all, delete-orphan")
    products = db.relationship("Product", backref="workspace", lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
