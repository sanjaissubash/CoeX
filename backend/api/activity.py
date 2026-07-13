from flask import jsonify, request

from backend.api import api_bp
from backend.models import ActivityLog


def _serialize(activity):
    return activity.to_dict()


@api_bp.route("/activity", methods=["GET"])
def list_activity():
    product_id = request.args.get("product_id")
    limit = min(int(request.args.get("limit", 100)), 500)

    query = ActivityLog.query
    if product_id:
        query = query.filter_by(product_id=product_id)

    activity = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return jsonify({"success": True, "data": [_serialize(item) for item in activity]})


@api_bp.route("/products/<product_id>/activity", methods=["GET"])
def list_product_activity(product_id):
    limit = min(int(request.args.get("limit", 100)), 500)
    activity = (
        ActivityLog.query.filter_by(product_id=product_id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return jsonify({"success": True, "data": [_serialize(item) for item in activity]})
