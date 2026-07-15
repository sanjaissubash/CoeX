from datetime import datetime
from backend.database import db
import uuid

class ComplianceFinding(db.Model):
    __tablename__ = "compliance_findings"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    compliance_account_id = db.Column(db.String(36), db.ForeignKey("compliance_accounts.id"), nullable=False)
    finding_id = db.Column(db.String(512), nullable=False)  # AWS ARN/ID
    title = db.Column(db.String(512), nullable=False)
    description = db.Column(db.Text)
    severity = db.Column(db.String(50), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    resource_id = db.Column(db.String(512))
    resource_type = db.Column(db.String(100))
    region = db.Column(db.String(50))
    source = db.Column(db.String(100))  # SecurityHub, Inspector, GuardDuty
    remediation = db.Column(db.Text)  # Suggesed actions/remediations
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"))  # Linked task if created
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "compliance_account_id": self.compliance_account_id,
            "finding_id": self.finding_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "region": self.region,
            "source": self.source,
            "remediation": self.remediation,
            "task_id": self.task_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
