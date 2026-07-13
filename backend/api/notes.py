from flask import request, jsonify
from backend.api import api_bp
from backend.database import db
from backend.models import Note

@api_bp.route("/notes", methods=["POST"])
def create_note():
    """Create new note."""
    data = request.get_json()
    
    if not data.get("title") or not data.get("note_type"):
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "details": "title and note_type are required"
        }), 400
    
    note = Note(
        project_id=data.get("project_id"),
        note_type=data["note_type"],
        title=data["title"],
        content=data.get("content", ""),
        tags=data.get("tags", []),
        pinned=data.get("pinned", False),
    )
    
    db.session.add(note)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": note.to_dict(),
        "message": "Note created successfully"
    }), 201

@api_bp.route("/notes/<note_id>", methods=["GET"])
def get_note(note_id):
    """Get single note."""
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "error": "Note not found"}), 404
    
    return jsonify({
        "success": True,
        "data": note.to_dict(),
        "message": "Note retrieved successfully"
    })

@api_bp.route("/notes/<note_id>", methods=["PUT"])
def update_note(note_id):
    """Update note."""
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "error": "Note not found"}), 404
    
    data = request.get_json()
    
    note.title = data.get("title", note.title)
    note.content = data.get("content", note.content)
    note.tags = data.get("tags", note.tags)
    note.pinned = data.get("pinned", note.pinned)
    if "project_id" in data:
        note.project_id = data["project_id"]
    if "note_type" in data:
        note.note_type = data["note_type"]
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "data": note.to_dict(),
        "message": "Note updated successfully"
    })

@api_bp.route("/notes/<note_id>", methods=["DELETE"])
def delete_note(note_id):
    """Delete note."""
    note = Note.query.get(note_id)
    if not note:
        return jsonify({"success": False, "error": "Note not found"}), 404
    
    db.session.delete(note)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Note deleted successfully"})

@api_bp.route("/notes", methods=["GET"])
def get_notes():
    """Get notes (global or project-specific)."""
    project_id = request.args.get("project_id")
    note_type = request.args.get("note_type")
    query_all = request.args.get("all") == "true"
    
    query = Note.query
    if not query_all:
        if project_id:
            query = query.filter_by(project_id=project_id)
        else:
            query = query.filter_by(project_id=None)
    
    if note_type:
        query = query.filter_by(note_type=note_type)
    
    notes = query.order_by(Note.pinned.desc(), Note.created_at.desc()).all()
    return jsonify({
        "success": True,
        "data": [n.to_dict() for n in notes],
        "message": "Notes retrieved successfully"
    })