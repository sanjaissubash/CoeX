from datetime import datetime

from flask import jsonify, request

from backend.api import api_bp
from backend.database import db
from backend.models import Project, Task
from backend.services.activity_service import ActivityService


def _parse_due_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


@api_bp.route("/projects/<project_id>/tasks", methods=["GET"])
def list_project_tasks(project_id):
    Project.query.get_or_404(project_id)
    status = request.args.get("status")
    query = Task.query.filter_by(project_id=project_id)
    if status:
        query = query.filter_by(status=status)
    tasks = query.order_by(Task.sort_order.asc(), Task.created_at.desc()).all()
    return jsonify({"success": True, "data": [t.to_dict() for t in tasks]})


@api_bp.route("/projects/<project_id>/tasks", methods=["POST"])
def create_project_task(project_id):
    Project.query.get_or_404(project_id)
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"success": False, "error": "title required"}), 400

    task = Task(
        project_id=project_id,
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
        project_id=project_id,
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
        project_id=task.project_id,
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
    project_id = task.project_id
    db.session.delete(task)
    db.session.commit()

    ActivityService.log_action(
        project_id=project_id,
        action="DELETED",
        entity_type="Task",
        entity_id=task_id,
    )
    return jsonify({"success": True})
