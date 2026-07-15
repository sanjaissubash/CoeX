from datetime import datetime
from backend.database import db
import uuid

class ComplianceAccount(db.Model):
    __tablename__ = "compliance_accounts"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    provider = db.Column(db.String(50), default="AWS")  # AWS, Azure, GCP
    account_id = db.Column(db.String(100), nullable=False)
    regions = db.Column(db.Text, default="us-east-1")  # comma-separated list of regions
    connection_method = db.Column(db.String(50), default="local_role")  # local_role, cross_account_role
    role_arn = db.Column(db.String(512))
    external_id = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "provider": self.provider,
            "account_id": self.account_id,
            "regions": self.regions,
            "connection_method": self.connection_method,
            "role_arn": self.role_arn,
            "external_id": self.external_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
