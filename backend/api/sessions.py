from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Session
from backend.services.activity_service import ActivityService

@api_bp.route("/sessions", methods=["POST"])
def create_session():
    """Create new session."""
    data = request.get_json()
    
    if not data.get("project_id") or not data.get("goal"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "project_id and goal are required"
        }), 400
    
    session = Session(
        project_id=data["project_id"],
        ai_tool=data.get("ai_tool", "manual"),
        goal=data["goal"],
        summary=data.get("summary", ""),
        outcome=data.get("outcome"),
        next_steps=data.get("next_steps"),
        full_output=data.get("full_output"),
        tags=data.get("tags", []),
    )
    
    db.session.add(session)
    db.session.commit()
    
    ActivityService.log_action(
        project_id=data["project_id"],
        action="CREATED",
        entity_type="Session",
        entity_id=session.id,
        details={"ai_tool": session.ai_tool, "goal": session.goal}
    )
    
    return jsonify({
        "success": True,
        "data": session.to_dict(),
        "message": "Session created successfully"
    }), 201

@api_bp.route("/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    """Get single session."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404
    
    return jsonify({
        "success": True,
        "data": session.to_dict(),
        "message": "Session retrieved successfully"
    })

@api_bp.route("/sessions/<session_id>", methods=["PUT"])
def update_session(session_id):
    """Update session."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404
    
    data = request.get_json()
    
    session.goal = data.get("goal", session.goal)
    session.summary = data.get("summary", session.summary)
    session.outcome = data.get("outcome", session.outcome)
    session.next_steps = data.get("next_steps", session.next_steps)
    session.full_output = data.get("full_output", session.full_output)
    session.tags = data.get("tags", session.tags)
    
    db.session.commit()
    
    ActivityService.log_action(
        project_id=session.project_id,
        action="UPDATED",
        entity_type="Session",
        entity_id=session.id
    )
    
    return jsonify({
        "success": True,
        "data": session.to_dict(),
        "message": "Session updated successfully"
    })

@api_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    """Delete session."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404
    
    project_id = session.project_id
    db.session.delete(session)
    db.session.commit()
    
    ActivityService.log_action(
        project_id=project_id,
        action="DELETED",
        entity_type="Session",
        entity_id=session_id
    )
    
    return jsonify({"success": True, "message": "Session deleted successfully"})

@api_bp.route("/projects/<project_id>/sessions", methods=["GET"])
def get_project_sessions(project_id):
    """Get all sessions for a project."""
    ai_tool = request.args.get("ai_tool")
    query = Session.query.filter_by(project_id=project_id)
    if ai_tool:
        query = query.filter_by(ai_tool=ai_tool)
    sessions = query.order_by(Session.session_date.desc()).all()
    return jsonify({
        "success": True,
        "data": [s.to_dict() for s in sessions],
        "message": "Sessions retrieved successfully"
    })