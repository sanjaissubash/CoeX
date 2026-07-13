from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__)


@api_bp.route("/ping")
def ping():
    return jsonify({"success": True, "message": "pong"})


# Import modules so their route decorators attach to the shared `api_bp`.
# Keep this list minimal for now; additional modules can be added as they
# are stabilized.
from backend.api import workspaces, families, projects

# Additional API modules: import them so their route decorators attach to
# the shared `api_bp`. These are required for the extended E2E smoke flow.
from backend.api import (
    context_blocks,
    notes,
    prompts,
    sessions,
    decisions,
    milestones,
    templates,
    research,
    activity,
    search,
)
from backend.api import context_generator
from backend.api import tasks

__all__ = ["api_bp"]
