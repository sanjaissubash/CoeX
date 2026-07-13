from backend.database import db
from datetime import datetime
import uuid

class Product(db.Model):
    __tablename__ = "products"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id"), nullable=False)
    family_id = db.Column(db.String(36), db.ForeignKey("families.id"), nullable=False)
    template_id = db.Column(db.String(36), db.ForeignKey("product_templates.id"))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    lifecycle = db.Column(db.String(50), default="IDEA", nullable=False)
    status = db.Column(db.String(50), default="ACTIVE", nullable=False)
    health_score = db.Column(db.Float, default=0.0)
    storage_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = db.Column(db.DateTime)
    ai_metadata = db.Column(db.JSON)
    
    progress = db.relationship("ProductProgress", backref="product", uselist=False, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "family_id": self.family_id,
            "template_id": self.template_id,
            "name": self.name,
            "description": self.description,
            "lifecycle": self.lifecycle,
            "status": self.status,
            "health_score": self.health_score,
            "storage_path": self.storage_path,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
        }
