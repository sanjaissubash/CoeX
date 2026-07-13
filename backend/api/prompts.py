from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Prompt
from datetime import datetime

@api_bp.route("/prompts", methods=["POST"])
def create_prompt():
    """Create new prompt."""
    data = request.get_json()
    
    if not data.get("name") or not data.get("prompt_text"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "name and prompt_text are required"
        }), 400
    
    prompt = Prompt(
        project_id=data.get("project_id"),
        name=data["name"],
        category=data.get("category"),
        prompt_text=data["prompt_text"],
        ai_tool=data.get("ai_tool"),
        tags=data.get("tags", []),
    )
    
    db.session.add(prompt)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": prompt.to_dict(),
        "message": "Prompt created successfully"
    }), 201

@api_bp.route("/prompts/<prompt_id>", methods=["GET"])
def get_prompt(prompt_id):
    """Get single prompt."""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({"success": False, "error": "Prompt not found"}), 404
    
    return jsonify({
        "success": True,
        "data": prompt.to_dict(),
        "message": "Prompt retrieved successfully"
    })

@api_bp.route("/prompts/<prompt_id>", methods=["PUT"])
def update_prompt(prompt_id):
    """Update prompt."""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({"success": False, "error": "Prompt not found"}), 404
    
    data = request.get_json()
    
    prompt.name = data.get("name", prompt.name)
    prompt.prompt_text = data.get("prompt_text", prompt.prompt_text)
    prompt.category = data.get("category", prompt.category)
    prompt.ai_tool = data.get("ai_tool", prompt.ai_tool)
    prompt.tags = data.get("tags", prompt.tags)
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": prompt.to_dict(),
        "message": "Prompt updated successfully"
    })

@api_bp.route("/prompts/<prompt_id>", methods=["DELETE"])
def delete_prompt(prompt_id):
    """Delete prompt."""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({"success": False, "error": "Prompt not found"}), 404
    
    db.session.delete(prompt)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Prompt deleted successfully"})

@api_bp.route("/prompts/<prompt_id>/use", methods=["POST"])
def use_prompt(prompt_id):
    """Track prompt usage."""
    prompt = Prompt.query.get(prompt_id)
    if not prompt:
        return jsonify({"success": False, "error": "Prompt not found"}), 404
    
    prompt.usage_count += 1
    prompt.last_used = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": prompt.to_dict(),
        "message": "Prompt usage updated"
    })

@api_bp.route("/prompts", methods=["GET"])
def get_prompts():
    """Get all prompts (global and project-specific)."""
    project_id = request.args.get("project_id")
    category = request.args.get("category")
    
    query = Prompt.query
    if project_id:
        query = query.filter((Prompt.project_id == project_id) | (Prompt.project_id == None))
    if category:
        query = query.filter_by(category=category)
    
    prompts = query.order_by(Prompt.created_at.desc()).all()
    return jsonify({
        "success": True,
        "data": [p.to_dict() for p in prompts],
        "message": "Prompts retrieved successfully"
    })