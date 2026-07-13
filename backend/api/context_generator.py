"""Context generator endpoint.

Aggregates product overview, context blocks, open tasks, active milestones,
recent decisions, recent sessions, research highlights, and assets into a
concise JSON structure and a compact text package suitable for AI context.

Deterministic. No AI models used.
"""
from flask import request, jsonify
from backend.api import api_bp
from backend.models import Asset, Product, ContextBlock, Task, Milestone, Decision, Session, Research
from backend.database import db
from datetime import datetime
from flask import current_app


def _summarize_recent(items, limit=5, title_key="title", summary_keys=None):
    out = []
    for it in items[:limit]:
        entry = {"id": getattr(it, "id", None), "title": getattr(it, title_key, None)}
        if summary_keys:
            for k in summary_keys:
                entry[k] = getattr(it, k, None)
        out.append(entry)
    return out


def _build_asset_tree(assets, product_id):
    tree = {}
    for asset in assets:
        parts = [part for part in asset["file_path"].split("/") if part]
        if len(parts) >= 2 and parts[0] == "products" and parts[1] == product_id:
            parts = parts[2:]
        node = tree
        for folder in parts[:-1]:
            node = node.setdefault(folder, {})
        node[parts[-1]] = None

    def render(node, prefix=""):
        lines = []
        entries = sorted(node.items(), key=lambda item: (item[1] is None, item[0].lower()))
        for index, (name, child) in enumerate(entries):
            is_last = index == len(entries) - 1
            connector = "`-- " if is_last else "|-- "
            lines.append(f"{prefix}{connector}{name}")
            if child is not None:
                extension = "    " if is_last else "|   "
                lines.extend(render(child, prefix + extension))
        return lines

    return "\n".join(render(tree)) if tree else ""


@api_bp.route("/products/<product_id>/context", methods=["GET"])
def generate_product_context(product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"success": False, "error": "product_not_found"}), 404

        # Overview
        overview = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "lifecycle": product.lifecycle,
            "status": product.status,
            "health_score": product.health_score,
        }

        # Context Blocks (all for product). Note: ContextBlock model doesn't
        # have a 'status' column in this schema, so don't filter by status.
        cblocks = ContextBlock.query.filter_by(product_id=product.id).order_by(ContextBlock.created_at.desc()).all()
        context_blocks = [
            {"id": cb.id, "title": cb.title, "content": cb.content, "priority": cb.priority}
            for cb in cblocks
        ]

        # Open tasks - filter by status not equal to 'done'
        tasks = Task.query.filter_by(product_id=product.id).filter(Task.status != 'done').order_by(Task.due_date.asc()).all()
        open_tasks = [{"id": t.id, "title": t.title, "due_date": t.due_date.isoformat() if t.due_date else None} for t in tasks]

        # Active milestones (Milestone model doesn't define due_date in this
        # schema, order by created_at instead)
        milestones = Milestone.query.filter_by(product_id=product.id).order_by(Milestone.created_at.desc()).all()
        # Milestone uses 'name' for title and 'completed_at' for completion
        active_milestones = [{
            "id": m.id,
            "title": m.name if hasattr(m, 'name') else getattr(m, 'title', None),
            "status": getattr(m, 'status', None),
            "completed_at": m.completed_at.isoformat() if getattr(m, 'completed_at', None) else None,
        } for m in milestones]

        # Recent decisions
        decisions = Decision.query.filter_by(product_id=product.id).order_by(Decision.created_at.desc()).all()
        # Decision model uses 'title' as the title field
        recent_decisions = _summarize_recent(decisions, limit=5, title_key="title")

        # Recent sessions
        sessions = Session.query.filter_by(product_id=product.id).order_by(Session.session_date.desc()).all()
        recent_sessions = _summarize_recent(sessions, limit=5, title_key="goal", summary_keys=["summary"])

        # Research highlights (titles)
        research = Research.query.filter_by(product_id=product.id).order_by(Research.created_at.desc()).all()
        research_highlights = _summarize_recent(research, limit=5, title_key="title", summary_keys=["notes"])

        assets_query = Asset.query.filter_by(product_id=product.id).order_by(Asset.created_at.desc()).all()
        assets = [
            {
                "id": asset.id,
                "name": asset.name,
                "file_type": asset.file_type,
                "size_bytes": asset.size_bytes,
                "file_path": asset.file_path,
            }
            for asset in assets_query
        ]
        asset_tree = _build_asset_tree(assets, product.id)

        # Build a paste-ready prompt for continuing product work in a new AI chat.
        parts = [
            "You are helping me continue work on this product in a new AI chat.",
            "",
            "Use the context below as the source of truth. First understand the product, then help with planning, implementation, troubleshooting, writing, or next steps. If information is missing, ask focused questions before assuming.",
            "",
            "# Product Context",
            f"Product: {product.name}",
        ]
        if product.description:
            parts.append(f"Purpose/Description: {product.description}")
        parts.append(f"Lifecycle: {product.lifecycle} | Status: {product.status} | Health: {product.health_score}")

        parts.extend([
            "",
            "# What To Preserve",
            "- Decisions, context blocks, task state, and assets below are existing product memory.",
            "- Keep any recommendations practical and tied to this product.",
        ])

        if context_blocks:
            parts.append("\n# Product Knowledge")
            for cb in context_blocks[:10]:
                parts.append(f"- {cb['title']}: {cb['content']}")

        if open_tasks:
            parts.append("\n# Current/Open Tasks")
            for t in open_tasks[:10]:
                parts.append(f"- {t['title']} (due: {t.get('due_date')})")

        if recent_decisions:
            parts.append("\n# Recent Decisions")
            for d in recent_decisions:
                parts.append(f"- {d.get('title')}")

        if recent_sessions:
            parts.append("\n# Recent AI/Work Sessions")
            for s in recent_sessions:
                parts.append(f"- {s.get('title')}: {s.get('summary')}")

        if research_highlights:
            parts.append("\n# Research Highlights")
            for r in research_highlights:
                parts.append(f"- {r.get('title')}: {r.get('notes')}")

        if assets:
            if asset_tree:
                parts.append("\n# Asset Folder Tree")
                parts.append(asset_tree)

            parts.append("\n# Assets")
            for asset in assets[:10]:
                parts.append(f"- {asset['file_path']} ({asset['file_type']}, {asset['size_bytes'] or 0} bytes)")

        parts.extend([
            "",
            "# How I Want You To Help",
            "Use this context to answer my next request with continuity. If there are risks, dependencies, or missing inputs, call them out clearly before moving forward.",
        ])

        compact_text = "\n".join(parts)

        payload = {
            "success": True,
            "data": {
                "overview": overview,
                "context_blocks": context_blocks,
                "open_tasks": open_tasks,
                "milestones": active_milestones,
                "recent_decisions": recent_decisions,
                "recent_sessions": recent_sessions,
                "research_highlights": research_highlights,
                "assets": assets,
                "asset_tree": asset_tree,
                "compact_text": compact_text,
            },
        }
        return jsonify(payload)
    except Exception:
        # Log full traceback to the application logger for easier debugging
        current_app.logger.exception("Error generating context for product %s", product_id)
        db.session.rollback()
        return jsonify({"success": False, "error": "internal", "message": "see server logs"}), 500


@api_bp.route("/tasks/<task_id>/context", methods=["GET"])
def generate_task_context(task_id):
    try:
        task = Task.query.get(task_id)
        if not task:
            return jsonify({"success": False, "error": "task_not_found"}), 404

        product = Product.query.get(task.product_id)
        if not product:
            return jsonify({"success": False, "error": "product_not_found"}), 404

        cblocks = ContextBlock.query.filter_by(product_id=product.id).order_by(ContextBlock.created_at.desc()).all()
        sibling_tasks = (
            Task.query.filter_by(product_id=product.id)
            .filter(Task.id != task.id)
            .order_by(Task.sort_order.asc(), Task.created_at.desc())
            .all()
        )
        decisions = Decision.query.filter_by(product_id=product.id).order_by(Decision.created_at.desc()).limit(5).all()
        research = Research.query.filter_by(product_id=product.id).order_by(Research.created_at.desc()).limit(5).all()
        assets_query = Asset.query.filter_by(product_id=product.id).order_by(Asset.created_at.desc()).all()
        assets = [
            {
                "id": asset.id,
                "name": asset.name,
                "file_type": asset.file_type,
                "size_bytes": asset.size_bytes,
                "file_path": asset.file_path,
            }
            for asset in assets_query
        ]
        asset_tree = _build_asset_tree(assets, product.id)

        parts = [
            "You are helping me continue a specific task for this product in a new AI chat.",
            "",
            "Use the task as the main objective. Use the product context only to keep decisions, assets, and constraints aligned. If the next step is unclear, propose the next practical action.",
            "",
            "# Current Task",
            f"Title: {task.title}",
            f"Status: {task.status} | Priority: {task.priority} | Due: {task.due_date.isoformat() if task.due_date else 'None'}",
        ]
        if task.description:
            parts.append(f"Description: {task.description}")

        parts.extend([
            "",
            "# Task Operating Instructions",
            "- Focus on completing or unblocking this task.",
            "- Keep recommendations aligned with the product context below.",
            "- If there are risks, dependencies, or missing inputs, call them out clearly.",
            "",
            "# Product Context",
            f"Product: {product.name}",
        ])
        if product.description:
            parts.append(f"Purpose/Description: {product.description}")
        parts.append(f"Lifecycle: {product.lifecycle} | Status: {product.status} | Health: {product.health_score}")

        if cblocks:
            parts.append("\n# Product Knowledge")
            for cb in cblocks[:10]:
                parts.append(f"- {cb.title}: {cb.content}")

        if sibling_tasks:
            parts.append("\n# Related Product Tasks")
            for sibling in sibling_tasks[:12]:
                parts.append(f"- [{sibling.status}] {sibling.title} (priority: {sibling.priority})")

        if decisions:
            parts.append("\n# Recent Decisions")
            for decision in decisions:
                parts.append(f"- {decision.title}: {decision.description}")

        if research:
            parts.append("\n# Research Highlights")
            for item in research:
                parts.append(f"- {item.title}: {item.notes or item.content[:160]}")

        if asset_tree:
            parts.append("\n# Asset Folder Tree")
            parts.append(asset_tree)

        parts.extend([
            "",
            "# How I Want You To Help",
            "Continue from this task context. Help me decide, implement, debug, write, or plan the next step based on the request I give after this prompt.",
        ])

        compact_text = "\n".join(parts)

        return jsonify({
            "success": True,
            "data": {
                "task": task.to_dict(),
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "description": product.description,
                    "lifecycle": product.lifecycle,
                    "status": product.status,
                },
                "asset_tree": asset_tree,
                "compact_text": compact_text,
            },
        })
    except Exception:
        current_app.logger.exception("Error generating context for task %s", task_id)
        db.session.rollback()
        return jsonify({"success": False, "error": "internal", "message": "see server logs"}), 500
