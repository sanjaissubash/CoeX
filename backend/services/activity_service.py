from backend.database import db
from backend.models import ActivityLog
from datetime import datetime

class ActivityService:
    @staticmethod
    def log_action(project_id, action, entity_type, entity_id=None, details=None):
        """Log an activity action."""
        log = ActivityLog(
            project_id=project_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            timestamp=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
        return log

    @staticmethod
    def get_project_activity(project_id, limit=50):
        """Get activity logs for a project."""
        return ActivityLog.query.filter_by(project_id=project_id).order_by(
            ActivityLog.timestamp.desc()
        ).limit(limit).all()
