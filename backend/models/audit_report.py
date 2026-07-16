from datetime import datetime
from backend.database import db
import uuid

class AuditReport(db.Model):
    __tablename__ = "audit_reports"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    compliance_account_id = db.Column(db.String(36), db.ForeignKey("compliance_accounts.id"), nullable=False)
    audit_cadence = db.Column(db.String(50), default="monthly")  # monthly, quarterly
    audit_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default="completed")  # completed, failed
    security_score = db.Column(db.Integer, default=100)
    total_resources = db.Column(db.Integer, default=0)
    backup_coverage_pct = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "compliance_account_id": self.compliance_account_id,
            "audit_cadence": self.audit_cadence,
            "audit_date": self.audit_date.isoformat() if self.audit_date else None,
            "status": self.status,
            "security_score": self.security_score,
            "total_resources": self.total_resources,
            "backup_coverage_pct": self.backup_coverage_pct,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
