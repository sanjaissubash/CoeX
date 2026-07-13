from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import ContextBlock
from backend.services.activity_service import ActivityService

@api_bp.route("/context-blocks", methods=["POST"])
def create_context_block():
    """Create new context block."""
    data = request.get_json()
    
    if not data.get("product_id") or not data.get("title"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "product_id and title are required"
        }), 400
    
    block = ContextBlock(
        product_id=data["product_id"],
        title=data["title"],
        content=data.get("content", ""),
        block_type=data.get("block_type"),
        priority=data.get("priority", 0),
    )
    
    db.session.add(block)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=data["product_id"],
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
        product_id=block.product_id,
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
    
    product_id = block.product_id
    db.session.delete(block)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=product_id,
        action="DELETED",
        entity_type="ContextBlock",
        entity_id=block_id
    )
    
    return jsonify({"success": True, "message": "Context block deleted successfully"})

@api_bp.route("/products/<product_id>/context-blocks", methods=["GET"])
def get_product_context_blocks(product_id):
    """Get all context blocks for a product."""
    blocks = ContextBlock.query.filter_by(product_id=product_id).order_by(ContextBlock.priority.desc()).all()
    return jsonify({
        "success": True,
        "data": [b.to_dict() for b in blocks],
        "message": "Context blocks retrieved successfully"
    })