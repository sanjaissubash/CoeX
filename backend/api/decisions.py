from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Decision
from backend.services.activity_service import ActivityService

@api_bp.route("/decisions", methods=["POST"])
def create_decision():
    """Create new decision."""
    data = request.get_json()
    
    if not data.get("product_id") or not data.get("title"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "product_id and title are required"
        }), 400
    
    decision = Decision(
        product_id=data["product_id"],
        title=data["title"],
        description=data.get("description", ""),
        rationale=data.get("rationale"),
        impact=data.get("impact"),
        alternatives=data.get("alternatives"),
        status=data.get("status", "active"),
        tags=data.get("tags", []),
    )
    
    db.session.add(decision)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=data["product_id"],
        action="CREATED",
        entity_type="Decision",
        entity_id=decision.id,
        details={"title": decision.title}
    )
    
    return jsonify({
        "success": True,
        "data": decision.to_dict(),
        "message": "Decision created successfully"
    }), 201

@api_bp.route("/decisions/<decision_id>", methods=["GET"])
def get_decision(decision_id):
    """Get single decision."""
    decision = Decision.query.get(decision_id)
    if not decision:
        return jsonify({"success": False, "error": "Decision not found"}), 404
    
    return jsonify({
        "success": True,
        "data": decision.to_dict(),
        "message": "Decision retrieved successfully"
    })

@api_bp.route("/decisions/<decision_id>", methods=["PUT"])
def update_decision(decision_id):
    """Update decision."""
    decision = Decision.query.get(decision_id)
    if not decision:
        return jsonify({"success": False, "error": "Decision not found"}), 404
    
    data = request.get_json()
    
    decision.title = data.get("title", decision.title)
    decision.description = data.get("description", decision.description)
    decision.rationale = data.get("rationale", decision.rationale)
    decision.impact = data.get("impact", decision.impact)
    decision.alternatives = data.get("alternatives", decision.alternatives)
    decision.status = data.get("status", decision.status)
    decision.tags = data.get("tags", decision.tags)
    
    db.session.commit()
    
    ActivityService.log_action(
        product_id=decision.product_id,
        action="UPDATED",
        entity_type="Decision",
        entity_id=decision.id
    )
    
    return jsonify({
        "success": True,
        "data": decision.to_dict(),
        "message": "Decision updated successfully"
    })

@api_bp.route("/decisions/<decision_id>", methods=["DELETE"])
def delete_decision(decision_id):
    """Delete decision."""
    decision = Decision.query.get(decision_id)
    if not decision:
        return jsonify({"success": False, "error": "Decision not found"}), 404
    
    product_id = decision.product_id
    db.session.delete(decision)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=product_id,
        action="DELETED",
        entity_type="Decision",
        entity_id=decision_id
    )
    
    return jsonify({"success": True, "message": "Decision deleted successfully"})

@api_bp.route("/products/<product_id>/decisions", methods=["GET"])
def get_product_decisions(product_id):
    """Get all decisions for a product."""
    status = request.args.get("status")
    query = Decision.query.filter_by(product_id=product_id)
    if status:
        query = query.filter_by(status=status)
    decisions = query.order_by(Decision.decision_date.desc()).all()
    return jsonify({
        "success": True,
        "data": [d.to_dict() for d in decisions],
        "message": "Decisions retrieved successfully"
    })