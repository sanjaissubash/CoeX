from datetime import datetime
from backend.database import db
import uuid


class CloudTrailSource(db.Model):
    """A configured CloudTrail log source for a project.

    `source_type` is either:
      - "local_folder": `location` is a folder of CloudTrail JSON files (real S3
        delivery layout supported), read directly off disk.
      - "s3": `location` is "s3://bucket[/prefix]" — the project has read-only
        access to the trail's S3 bucket and events are fetched live, scoped to
        the date range requested at query time (never a full-bucket scan).
    """
    __tablename__ = "cloudtrail_sources"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey("projects.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    source_type = db.Column(db.String(50), default="local_folder")  # local_folder, s3

    # For s3 sources, AWS connection (auth + AWS account ID) is shared with the
    # project's Compliance/Audit tabs via this link, instead of every CloudTrail
    # source re-collecting its own role ARN / external ID. See ComplianceAccount.
    compliance_account_id = db.Column(db.String(36), db.ForeignKey("compliance_accounts.id"))

    location = db.Column(db.Text, nullable=False)  # folder path OR s3://bucket/prefix
    regions = db.Column(db.Text, default="us-east-1")  # comma-separated; CloudTrail's own bucket region layout, only used for s3

    # Legacy fields, kept only so CloudTrailSource rows created before the
    # compliance_account_id link existed keep working (see
    # cloudtrail_service.resolve_s3_connection). New s3 sources always go
    # through compliance_account_id instead.
    account_id = db.Column(db.String(100))
    connection_method = db.Column(db.String(50), default="local_role")
    role_arn = db.Column(db.String(512))
    external_id = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "source_type": self.source_type,
            "compliance_account_id": self.compliance_account_id,
            "location": self.location,
            "regions": self.regions,
            "account_id": self.account_id,
            "connection_method": self.connection_method,
            "role_arn": self.role_arn,
            "external_id": self.external_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
