from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Research
from backend.services.activity_service import ActivityService

@api_bp.route("/research", methods=["POST"])
def create_research():
    """Create new research entry."""
    data = request.get_json()
    
    if not data.get("product_id") or not data.get("title"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "product_id and title are required"
        }), 400
    
    research = Research(
        product_id=data["product_id"],
        title=data["title"],
        category=data.get("category", "general"),
        source=data.get("source"),
        url=data.get("url"),
        content=data["content"],
        notes=data.get("notes"),
        tags=data.get("tags", []),
    )
    
    db.session.add(research)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=data["product_id"],
        action="CREATED",
        entity_type="Research",
        entity_id=research.id,
        details={"title": research.title, "category": research.category}
    )
    
    return jsonify({
        "success": True,
        "data": research.to_dict(),
        "message": "Research created successfully"
    }), 201

@api_bp.route("/research/<research_id>", methods=["GET"])
def get_research(research_id):
    """Get single research entry."""
    research = Research.query.get(research_id)
    if not research:
        return jsonify({"success": False, "error": "Research not found"}), 404
    
    return jsonify({
        "success": True,
        "data": research.to_dict(),
        "message": "Research retrieved successfully"
    })

@api_bp.route("/research/<research_id>", methods=["PUT"])
def update_research(research_id):
    """Update research."""
    research = Research.query.get(research_id)
    if not research:
        return jsonify({"success": False, "error": "Research not found"}), 404
    
    data = request.get_json()
    
    research.title = data.get("title", research.title)
    research.content = data.get("content", research.content)
    research.category = data.get("category", research.category)
    research.source = data.get("source", research.source)
    research.url = data.get("url", research.url)
    research.notes = data.get("notes", research.notes)
    research.tags = data.get("tags", research.tags)
    
    db.session.commit()
    
    ActivityService.log_action(
        product_id=research.product_id,
        action="UPDATED",
        entity_type="Research",
        entity_id=research.id
    )
    
    return jsonify({
        "success": True,
        "data": research.to_dict(),
        "message": "Research updated successfully"
    })

@api_bp.route("/research/<research_id>", methods=["DELETE"])
def delete_research(research_id):
    """Delete research."""
    research = Research.query.get(research_id)
    if not research:
        return jsonify({"success": False, "error": "Research not found"}), 404
    
    product_id = research.product_id
    db.session.delete(research)
    db.session.commit()
    
    ActivityService.log_action(
        product_id=product_id,
        action="DELETED",
        entity_type="Research",
        entity_id=research_id
    )
    
    return jsonify({"success": True, "message": "Research deleted successfully"})

@api_bp.route("/products/<product_id>/research", methods=["GET"])
def get_product_research(product_id):
    """Get all research for a product."""
    category = request.args.get("category")
    query = Research.query.filter_by(product_id=product_id)
    if category:
        query = query.filter_by(category=category)
    research = query.order_by(Research.created_at.desc()).all()
    return jsonify({
        "success": True,
        "data": [r.to_dict() for r in research],
        "message": "Research retrieved successfully"
    })