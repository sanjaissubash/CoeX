from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Milestone
from backend.services.activity_service import ActivityService
from datetime import datetime

@api_bp.route("/milestones", methods=["POST"])
def create_milestone():
    """Create new milestone."""
    data = request.get_json()
    
    if not data.get("product_id") or not data.get("name"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "product_id and name are required"
        }), 400
    
    milestone = Milestone(
        product_id=data["product_id"],
        name=data["name"],
        description=data.get("description"),
        lifecycle_stage=data.get("lifecycle_stage", "IDEA"),
        status=data.get("status", "active"),
    )
    
    db.session.add(milestone)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=data["product_id"],
        action="CREATED",
        entity_type="Milestone",
        entity_id=milestone.id,
        details={"name": milestone.name}
    )
    
    return jsonify({
        "success": True,
        "data": milestone.to_dict(),
        "message": "Milestone created successfully"
    }), 201

@api_bp.route("/milestones/<milestone_id>", methods=["GET"])
def get_milestone(milestone_id):
    """Get single milestone."""
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({"success": False, "error": "Milestone not found"}), 404
    
    return jsonify({
        "success": True,
        "data": milestone.to_dict(),
        "message": "Milestone retrieved successfully"
    })

@api_bp.route("/milestones/<milestone_id>", methods=["PUT"])
def update_milestone(milestone_id):
    """Update milestone."""
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({"success": False, "error": "Milestone not found"}), 404
    
    data = request.get_json()
    
    milestone.name = data.get("name", milestone.name)
    milestone.description = data.get("description", milestone.description)
    milestone.lifecycle_stage = data.get("lifecycle_stage", milestone.lifecycle_stage)
    milestone.status = data.get("status", milestone.status)
    
    if data.get("status") == "completed" and not milestone.completed_at:
        milestone.completed_at = datetime.utcnow()
    
    db.session.commit()
    
    ActivityService.log_action(
        product_id=milestone.product_id,
        action="UPDATED",
        entity_type="Milestone",
        entity_id=milestone.id
    )
    
    return jsonify({
        "success": True,
        "data": milestone.to_dict(),
        "message": "Milestone updated successfully"
    })

@api_bp.route("/milestones/<milestone_id>", methods=["DELETE"])
def delete_milestone(milestone_id):
    """Delete milestone."""
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({"success": False, "error": "Milestone not found"}), 404
    
    product_id = milestone.product_id
    db.session.delete(milestone)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=product_id,
        action="DELETED",
        entity_type="Milestone",
        entity_id=milestone_id
    )
    
    return jsonify({"success": True, "message": "Milestone deleted successfully"})

@api_bp.route("/products/<product_id>/milestones", methods=["GET"])
def get_product_milestones(product_id):
    """Get all milestones for a product."""
    milestones = Milestone.query.filter_by(product_id=product_id).order_by(Milestone.sort_order).all()
    return jsonify({
        "success": True,
        "data": [m.to_dict() for m in milestones],
        "message": "Milestones retrieved successfully"
    })
