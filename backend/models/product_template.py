from backend.database import db
from datetime import datetime
import uuid

class ProductTemplate(db.Model):
    __tablename__ = "product_templates"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    default_milestones = db.Column(db.JSON)
    default_tasks = db.Column(db.JSON)
    default_context_blocks = db.Column(db.JSON)
    default_folder_structure = db.Column(db.JSON)
    default_notes = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }
