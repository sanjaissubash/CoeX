from flask import jsonify
from backend.api import api_bp
from backend.models import ProductTemplate
from backend.services.template_service import TemplateService

@api_bp.route("/templates", methods=["GET"])
def get_templates():
    """Get all product templates."""
    TemplateService.get_or_create_default_templates()
    templates = ProductTemplate.query.all()
    return jsonify({
        "success": True,
        "data": [t.to_dict() for t in templates],
        "message": "Templates retrieved successfully"
    })

@api_bp.route("/templates/<template_id>", methods=["GET"])
def get_template(template_id):
    """Get single template."""
    template = ProductTemplate.query.get(template_id)
    if not template:
        return jsonify({
            "success": False,
            "error": "Template not found"
        }), 404
    
    return jsonify({
        "success": True,
        "data": template.to_dict(),
        "message": "Template retrieved successfully"
    })
