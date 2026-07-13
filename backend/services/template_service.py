from backend.database import db
from backend.models import ProductTemplate
import json

class TemplateService:
    @staticmethod
    def get_or_create_default_templates():
        """Ensure default templates exist."""
        defaults = [
            {
                "id": "google-sheet",
                "name": "Google Sheet Product",
                "description": "Template for spreadsheet-based products",
                "default_tasks": json.dumps([
                    {"title": "Setup Google Sheet", "description": "Create and configure the base sheet"},
                    {"title": "Add formulas", "description": "Implement required formulas"},
                    {"title": "Test functionality", "description": "Verify all features work"},
                ]),
                "default_context_blocks": json.dumps([
                    {"title": "Built with Google Sheets", "content": ""},
                    {"title": "Platform & Tools", "content": ""},
                    {"title": "Target Audience", "content": ""},
                ]),
            },
            {
                "id": "resume",
                "name": "Resume Product",
                "description": "Template for resume/CV products",
                "default_tasks": json.dumps([
                    {"title": "Design layout", "description": "Create visual design"},
                    {"title": "Write content", "description": "Add professional content"},
                    {"title": "Export to PDF", "description": "Generate PDF version"},
                ]),
                "default_context_blocks": json.dumps([
                    {"title": "Format & Design", "content": ""},
                    {"title": "Target Market", "content": ""},
                    {"title": "ATS Considerations", "content": ""},
                ]),
            },
        ]
        
        for template_data in defaults:
            if not ProductTemplate.query.get(template_data["id"]):
                template = ProductTemplate(
                    id=template_data["id"],
                    name=template_data["name"],
                    description=template_data["description"],
                    default_tasks=template_data.get("default_tasks"),
                    default_context_blocks=template_data.get("default_context_blocks"),
                )
                db.session.add(template)
        
        db.session.commit()
