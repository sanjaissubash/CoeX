from datetime import datetime

from flask import jsonify, request

from backend.api import api_bp
from backend.database import db
from backend.models import Product, Task
from backend.services.activity_service import ActivityService


def _parse_due_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


@api_bp.route("/products/<product_id>/tasks", methods=["GET"])
def list_product_tasks(product_id):
    Product.query.get_or_404(product_id)
    status = request.args.get("status")
    query = Task.query.filter_by(product_id=product_id)
    if status:
        query = query.filter_by(status=status)
    tasks = query.order_by(Task.sort_order.asc(), Task.created_at.desc()).all()
    return jsonify({"success": True, "data": [t.to_dict() for t in tasks]})


@api_bp.route("/products/<product_id>/tasks", methods=["POST"])
def create_product_task(product_id):
    Product.query.get_or_404(product_id)
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"success": False, "error": "title required"}), 400

    task = Task(
        product_id=product_id,
        title=title,
        description=body.get("description"),
        priority=body.get("priority", "medium"),
        status=body.get("status", "open"),
        milestone_id=body.get("milestone_id"),
        due_date=_parse_due_date(body.get("due_date")),
    )
    db.session.add(task)
    db.session.commit()

    ActivityService.log_action(
        product_id=product_id,
        action="CREATED",
        entity_type="Task",
        entity_id=task.id,
        details={"title": task.title},
    )
    return jsonify({"success": True, "data": task.to_dict()}), 201


@api_bp.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"success": False, "error": "not found"}), 404
    return jsonify({"success": True, "data": task.to_dict()})


@api_bp.route("/tasks/<task_id>", methods=["PATCH", "PUT"])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"success": False, "error": "not found"}), 404

    body = request.get_json(silent=True) or {}
    for key in ["title", "description", "priority", "status", "milestone_id", "sort_order"]:
        if key in body:
            setattr(task, key, body[key])

    if "due_date" in body:
        task.due_date = _parse_due_date(body.get("due_date"))

    if body.get("status") in {"completed", "done"} and not task.completed_at:
        task.completed_at = datetime.utcnow()
    elif body.get("status") in {"open", "in_progress"}:
        task.completed_at = None

    task.updated_at = datetime.utcnow()
    db.session.commit()

    ActivityService.log_action(
        product_id=task.product_id,
        action="UPDATED",
        entity_type="Task",
        entity_id=task.id,
        details={"updated_fields": list(body.keys())},
    )
    return jsonify({"success": True, "data": task.to_dict()})


@api_bp.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"success": False, "error": "not found"}), 404
    product_id = task.product_id
    db.session.delete(task)
    db.session.commit()

    ActivityService.log_action(
        product_id=product_id,
        action="DELETED",
        entity_type="Task",
        entity_id=task_id,
    )
    return jsonify({"success": True})
