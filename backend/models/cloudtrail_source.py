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
    location = db.Column(db.Text, nullable=False)  # folder path OR s3://bucket/prefix
    account_id = db.Column(db.String(100))  # required for s3 (used to build the AWSLogs/<account_id>/... key path)
    regions = db.Column(db.Text, default="us-east-1")  # comma-separated, only used for s3
    connection_method = db.Column(db.String(50), default="local_role")  # local_role, cross_account_role (s3 only)
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
            "location": self.location,
            "account_id": self.account_id,
            "regions": self.regions,
            "connection_method": self.connection_method,
            "role_arn": self.role_arn,
            "external_id": self.external_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
