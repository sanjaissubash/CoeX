from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import ContextBlock
from backend.services.activity_service import ActivityService

@api_bp.route("/context-blocks", methods=["POST"])
def create_context_block():
    """Create new context block."""
    data = request.get_json()
    
    if not data.get("project_id") or not data.get("title"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "project_id and title are required"
        }), 400
    
    block = ContextBlock(
        project_id=data["project_id"],
        title=data["title"],
        content=data.get("content", ""),
        block_type=data.get("block_type"),
        priority=data.get("priority", 0),
    )
    
    db.session.add(block)
    db.session.commit()
    
    ActivityService.log_action(
        project_id=data["project_id"],
        action="CREATED",
        entity_type="ContextBlock",
        entity_id=block.id,
        details={"title": block.title}
    )
    
    return jsonify({
        "success": True,
        "data": block.to_dict(),
        "message": "Context block created successfully"
    }), 201

@api_bp.route("/context-blocks/<block_id>", methods=["GET"])
def get_context_block(block_id):
    """Get single context block."""
    block = ContextBlock.query.get(block_id)
    if not block:
        return jsonify({"success": False, "error": "Context block not found"}), 404
    
    return jsonify({
        "success": True,
        "data": block.to_dict(),
        "message": "Context block retrieved successfully"
    })

@api_bp.route("/context-blocks/<block_id>", methods=["PUT"])
def update_context_block(block_id):
    """Update context block."""
    block = ContextBlock.query.get(block_id)
    if not block:
        return jsonify({"success": False, "error": "Context block not found"}), 404
    
    data = request.get_json()
    
    block.title = data.get("title", block.title)
    block.content = data.get("content", block.content)
    block.block_type = data.get("block_type", block.block_type)
    block.priority = data.get("priority", block.priority)
    
    db.session.commit()
    
    ActivityService.log_action(
        project_id=block.project_id,
        action="UPDATED",
        entity_type="ContextBlock",
        entity_id=block.id
    )
    
    return jsonify({
        "success": True,
        "data": block.to_dict(),
        "message": "Context block updated successfully"
    })

@api_bp.route("/context-blocks/<block_id>", methods=["DELETE"])
def delete_context_block(block_id):
    """Delete context block."""
    block = ContextBlock.query.get(block_id)
    if not block:
        return jsonify({"success": False, "error": "Context block not found"}), 404
    
    project_id = block.project_id
    db.session.delete(block)
    db.session.commit()
    
    ActivityService.log_action(
        project_id=project_id,
        action="DELETED",
        entity_type="ContextBlock",
        entity_id=block_id
    )
    
    return jsonify({"success": True, "message": "Context block deleted successfully"})

@api_bp.route("/projects/<project_id>/context-blocks", methods=["GET"])
def get_project_context_blocks(project_id):
    """Get all context blocks for a project."""
    block_type = request.args.get("block_type")
    query = ContextBlock.query.filter_by(project_id=project_id)
    if block_type:
        # Support fetching general blocks by querying for "general" which maps to None or "general"
        if block_type == "general":
            query = query.filter(ContextBlock.block_type.in_([None, "", "general"]))
        else:
            query = query.filter_by(block_type=block_type)
    
    blocks = query.order_by(ContextBlock.priority.desc()).all()
    return jsonify({
        "success": True,
        "data": [b.to_dict() for b in blocks],
        "message": "Context blocks retrieved successfully"
    })