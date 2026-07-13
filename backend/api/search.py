from flask import jsonify, request

from backend.api import api_bp
from backend.models import (
    ContextBlock,
    Decision,
    Family,
    Note,
    Project,
    Prompt,
    Research,
    Session,
)


def _matches(query, *values):
    needle = query.casefold()
    return any(needle in str(value or "").casefold() for value in values)


@api_bp.route("/search", methods=["GET"])
def search():
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"success": True, "data": []})

    results = []

    for project in Project.query.order_by(Project.updated_at.desc()).all():
        if _matches(q, project.name, project.description, project.lifecycle, project.status):
            results.append({
                "type": "project",
                "id": project.id,
                "title": project.name,
                "subtitle": project.description,
                "href": f"/projects/{project.id}",
            })

    for family in Family.query.order_by(Family.updated_at.desc()).all():
        if _matches(q, family.name, family.description):
            results.append({
                "type": "family",
                "id": family.id,
                "title": family.name,
                "subtitle": family.description,
                "href": "/families",
            })

    for note in Note.query.order_by(Note.updated_at.desc()).all():
        if _matches(q, note.title, note.content, note.note_type):
            results.append({
                "type": "note",
                "id": note.id,
                "title": note.title,
                "subtitle": note.content,
                "href": f"/projects/{note.project_id}" if note.project_id else "/notes",
            })

    for prompt in Prompt.query.order_by(Prompt.updated_at.desc()).all():
        if _matches(q, prompt.name, prompt.prompt_text, prompt.category, prompt.ai_tool):
            results.append({
                "type": "prompt",
                "id": prompt.id,
                "title": prompt.name,
                "subtitle": prompt.prompt_text,
                "href": f"/projects/{prompt.project_id}" if prompt.project_id else "/search",
            })

    for research in Research.query.order_by(Research.updated_at.desc()).all():
        if _matches(q, research.title, research.content, research.notes, research.category, research.source):
            results.append({
                "type": "research",
                "id": research.id,
                "title": research.title,
                "subtitle": research.notes or research.content,
                "href": f"/projects/{research.project_id}",
            })

    for decision in Decision.query.order_by(Decision.updated_at.desc()).all():
        if _matches(q, decision.title, decision.description, decision.rationale, decision.impact):
            results.append({
                "type": "decision",
                "id": decision.id,
                "title": decision.title,
                "subtitle": decision.description,
                "href": f"/projects/{decision.project_id}",
            })

    for session in Session.query.order_by(Session.updated_at.desc()).all():
        if _matches(q, session.goal, session.summary, session.outcome, session.ai_tool):
            results.append({
                "type": "session",
                "id": session.id,
                "title": session.goal,
                "subtitle": session.summary,
                "href": f"/projects/{session.project_id}",
            })

    for block in ContextBlock.query.order_by(ContextBlock.updated_at.desc()).all():
        if _matches(q, block.title, block.content, block.block_type):
            results.append({
                "type": "context",
                "id": block.id,
                "title": block.title,
                "subtitle": block.content,
                "href": f"/projects/{block.project_id}",
            })

    return jsonify({"success": True, "data": results[:100]})
