"""Families API (clean, minimal implementation).

Provides CRUD endpoints for Family used by the frontend smoke tests.
"""
import logging
from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Family, Workspace

logger = logging.getLogger(__name__)


def _serialize_family(f):
    return f.to_dict()


@api_bp.route("/families/", methods=["GET"])
def families_list():
    try:
        workspace_id = request.args.get("workspace_id")
        q = Family.query
        if workspace_id:
            q = q.filter_by(workspace_id=workspace_id)
        fams = q.order_by(Family.id).all()
        return jsonify({"success": True, "data": [_serialize_family(f) for f in fams]})
    except Exception:
        logger.exception("listing families")
        return jsonify({"success": False, "error": "internal"}), 500


@api_bp.route("/families/", methods=["POST"])
def families_create():
    try:
        data = request.get_json(force=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"success": False, "error": "name is required"}), 400

        # single global workspace: ignore any workspace_id from the client and
        # ensure a default workspace exists to satisfy DB constraints.
        ws = Workspace.query.first()
        if not ws:
            ws = Workspace(name="Default Workspace")
            db.session.add(ws)
            db.session.commit()

        fam = Family(workspace_id=ws.id, name=name, description=data.get("description"))
        db.session.add(fam)
        db.session.commit()
        return jsonify({"success": True, "data": _serialize_family(fam)}), 201
    except Exception:
        db.session.rollback()
        logger.exception("creating family")
        return jsonify({"success": False, "error": "internal"}), 500


@api_bp.route("/families/<fid>", methods=["GET"])
def families_get(fid):
    try:
        f = Family.query.get_or_404(fid)
        return jsonify({"success": True, "data": _serialize_family(f)})
    except Exception:
        logger.exception("getting family %s", fid)
        return jsonify({"success": False, "error": "internal"}), 500


@api_bp.route("/families/<fid>", methods=["PATCH"])
def families_patch(fid):
    try:
        f = Family.query.get_or_404(fid)
        data = request.get_json(silent=True) or {}
        for key in ("name", "description", "icon", "color", "display_order"):
            if key in data:
                setattr(f, key, data[key])
        db.session.commit()
        return jsonify({"success": True, "data": _serialize_family(f)})
    except Exception:
        db.session.rollback()
        logger.exception("patching family %s", fid)
        return jsonify({"success": False, "error": "internal"}), 500


@api_bp.route("/families/<fid>", methods=["DELETE"])
def families_delete(fid):
    try:
        f = Family.query.get_or_404(fid)
        db.session.delete(f)
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        db.session.rollback()
        logger.exception("deleting family %s", fid)
        return jsonify({"success": False, "error": "internal"}), 500
