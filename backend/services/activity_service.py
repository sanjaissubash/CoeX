from backend.database import db
from backend.models import ActivityLog
from datetime import datetime

class ActivityService:
    @staticmethod
    def log_action(product_id, action, entity_type, entity_id=None, details=None):
        """Log an activity action."""
        log = ActivityLog(
            product_id=product_id,
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
    def get_product_activity(product_id, limit=50):
        """Get activity logs for a product."""
        return ActivityLog.query.filter_by(product_id=product_id).order_by(
            ActivityLog.timestamp.desc()
        ).limit(limit).all()
