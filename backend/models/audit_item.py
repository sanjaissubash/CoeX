from datetime import datetime
from backend.database import db
import uuid

class AuditItem(db.Model):
    __tablename__ = "audit_items"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_report_id = db.Column(db.String(36), db.ForeignKey("audit_reports.id"), nullable=False)
    resource_id = db.Column(db.String(512), nullable=False)
    resource_type = db.Column(db.String(100), nullable=False)  # ec2, rds, lambda, ecs, s3, etc.
    region = db.Column(db.String(50))
    audit_type = db.Column(db.String(50), default="security")  # security, resource, backup
    status = db.Column(db.String(50), default="compliant")  # compliant, non-compliant
    is_new_resource = db.Column(db.Boolean, default=False)  # true if first time seen in quarterly audits
    backup_enabled = db.Column(db.Boolean, default=False)
    details = db.Column(db.Text)
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"))  # Linked task if created for remediation
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "audit_report_id": self.audit_report_id,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "region": self.region,
            "audit_type": self.audit_type,
            "status": self.status,
            "is_new_resource": self.is_new_resource,
            "backup_enabled": self.backup_enabled,
            "details": self.details,
            "task_id": self.task_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
