from flask import jsonify, request
from backend.api import api_bp
from backend.database import db
from backend.models import Workspace

@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "success": True,
        "message": "API is running",
        "status": "healthy"
    })

@api_bp.route("/workspaces", methods=["GET"])
def get_workspaces():
    """Get all workspaces."""
    workspaces = Workspace.query.all()
    return jsonify({
        "success": True,
        "data": [w.to_dict() for w in workspaces],
        "message": "Workspaces retrieved successfully"
    })

@api_bp.route("/workspaces/<workspace_id>", methods=["GET"])
def get_workspace(workspace_id):
    """Get single workspace."""
    workspace = Workspace.query.get(workspace_id)
    if not workspace:
        return jsonify({
            "success": False,
            "error": "Workspace not found",
            "details": f"Workspace {workspace_id} does not exist"
        }), 404
    
    return jsonify({
        "success": True,
        "data": workspace.to_dict(),
        "message": "Workspace retrieved successfully"
    })

