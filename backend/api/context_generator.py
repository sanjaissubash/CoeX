"""Context generator endpoint.

Aggregates project overview, context blocks, open tasks, active milestones,
recent decisions, recent sessions, research highlights, and assets into a
concise JSON structure and a compact text package suitable for AI context.

Deterministic. No AI models used.
"""
from flask import request, jsonify
from backend.api import api_bp
from backend.models import Asset, Project, ContextBlock, Task, Milestone, Decision, Session, Research
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


def _build_asset_tree(assets, project_id):
    tree = {}
    for asset in assets:
        parts = [part for part in asset["file_path"].split("/") if part]
        if len(parts) >= 2 and parts[0] == "projects" and parts[1] == project_id:
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


@api_bp.route("/projects/<project_id>/context", methods=["GET"])
def generate_project_context(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "project_not_found"}), 404

        # Overview
        overview = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "lifecycle": project.lifecycle,
            "status": project.status,
            "health_score": project.health_score,
        }

        # Context Blocks (all for project). Note: ContextBlock model doesn't
        # have a 'status' column in this schema, so don't filter by status.
        cblocks = ContextBlock.query.filter_by(project_id=project.id).order_by(ContextBlock.created_at.desc()).all()
        context_blocks = [
            {"id": cb.id, "title": cb.title, "content": cb.content, "priority": cb.priority}
            for cb in cblocks
        ]

        # Open tasks - filter by status not equal to 'done'
        tasks = Task.query.filter_by(project_id=project.id).filter(Task.status != 'done').order_by(Task.due_date.asc()).all()
        open_tasks = [{"id": t.id, "title": t.title, "due_date": t.due_date.isoformat() if t.due_date else None} for t in tasks]

        # Active milestones (Milestone model doesn't define due_date in this
        # schema, order by created_at instead)
        milestones = Milestone.query.filter_by(project_id=project.id).order_by(Milestone.created_at.desc()).all()
        # Milestone uses 'name' for title and 'completed_at' for completion
        active_milestones = [{
            "id": m.id,
            "title": m.name if hasattr(m, 'name') else getattr(m, 'title', None),
            "status": getattr(m, 'status', None),
            "completed_at": m.completed_at.isoformat() if getattr(m, 'completed_at', None) else None,
        } for m in milestones]

        # Recent decisions
        decisions = Decision.query.filter_by(project_id=project.id).order_by(Decision.created_at.desc()).all()
        # Decision model uses 'title' as the title field
        recent_decisions = _summarize_recent(decisions, limit=5, title_key="title")

        # Recent sessions
        sessions = Session.query.filter_by(project_id=project.id).order_by(Session.session_date.desc()).all()
        recent_sessions = _summarize_recent(sessions, limit=5, title_key="goal", summary_keys=["summary"])

        # Research highlights (titles)
        research = Research.query.filter_by(project_id=project.id).order_by(Research.created_at.desc()).all()
        research_highlights = _summarize_recent(research, limit=5, title_key="title", summary_keys=["notes"])

        assets_query = Asset.query.filter_by(project_id=project.id).order_by(Asset.created_at.desc()).all()
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
        asset_tree = _build_asset_tree(assets, project.id)

        # Build a paste-ready prompt for continuing project work in a new AI chat.
        parts = [
            "You are helping me continue work on this project in a new AI chat.",
            "",
            "Use the context below as the source of truth. First understand the project, then help with planning, implementation, troubleshooting, writing, or next steps. If information is missing, ask focused questions before assuming.",
            "",
            "# Project Context",
            f"Project: {project.name}",
        ]
        if project.description:
            parts.append(f"Purpose/Description: {project.description}")
        parts.append(f"Lifecycle: {project.lifecycle} | Status: {project.status} | Health: {project.health_score}")

        parts.extend([
            "",
            "# What To Preserve",
            "- Decisions, context blocks, task state, and assets below are existing project memory.",
            "- Keep any recommendations practical and tied to this project.",
        ])

        if context_blocks:
            parts.append("\n# Project Knowledge")
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
        current_app.logger.exception("Error generating context for project %s", project_id)
        db.session.rollback()
        return jsonify({"success": False, "error": "internal", "message": "see server logs"}), 500


@api_bp.route("/tasks/<task_id>/context", methods=["GET"])
def generate_task_context(task_id):
    try:
        task = Task.query.get(task_id)
        if not task:
            return jsonify({"success": False, "error": "task_not_found"}), 404

        project = Project.query.get(task.project_id)
        if not project:
            return jsonify({"success": False, "error": "project_not_found"}), 404

        cblocks = ContextBlock.query.filter_by(project_id=project.id).order_by(ContextBlock.created_at.desc()).all()
        sibling_tasks = (
            Task.query.filter_by(project_id=project.id)
            .filter(Task.id != task.id)
            .order_by(Task.sort_order.asc(), Task.created_at.desc())
            .all()
        )
        decisions = Decision.query.filter_by(project_id=project.id).order_by(Decision.created_at.desc()).limit(5).all()
        research = Research.query.filter_by(project_id=project.id).order_by(Research.created_at.desc()).limit(5).all()
        assets_query = Asset.query.filter_by(project_id=project.id).order_by(Asset.created_at.desc()).all()
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
        asset_tree = _build_asset_tree(assets, project.id)

        parts = [
            "You are helping me continue a specific task for this project in a new AI chat.",
            "",
            "Use the task as the main objective. Use the project context only to keep decisions, assets, and constraints aligned. If the next step is unclear, propose the next practical action.",
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
            "- Keep recommendations aligned with the project context below.",
            "- If there are risks, dependencies, or missing inputs, call them out clearly.",
            "",
            "# Project Context",
            f"Project: {project.name}",
        ])
        if project.description:
            parts.append(f"Purpose/Description: {project.description}")
        parts.append(f"Lifecycle: {project.lifecycle} | Status: {project.status} | Health: {project.health_score}")

        if cblocks:
            parts.append("\n# Project Knowledge")
            for cb in cblocks[:10]:
                parts.append(f"- {cb.title}: {cb.content}")

        if sibling_tasks:
            parts.append("\n# Related Project Tasks")
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
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "lifecycle": project.lifecycle,
                    "status": project.status,
                },
                "asset_tree": asset_tree,
                "compact_text": compact_text,
            },
        })
    except Exception:
        current_app.logger.exception("Error generating context for task %s", task_id)
        db.session.rollback()
        return jsonify({"success": False, "error": "internal", "message": "see server logs"}), 500


@api_bp.route("/context/verify-ollama", methods=["POST"])
def verify_context_ollama():
    try:

        data = request.get_json() or {}
        text = data.get("text", "")
        if not text:
            return jsonify({"success": True, "findings": []})

        import requests
        import json

        # Dynamic model selection
        active_model = "qwen2.5:3b"
        try:
            list_res = requests.get("http://localhost:11434/api/tags", timeout=1.5)
            if list_res.status_code == 200:
                models_list = list_res.json().get("models", [])
                names = [m.get("name") for m in models_list]
                if names and active_model not in names and "qwen2.5:3b" not in names:
                    # Look for any pulled model containing instructions or names
                    matched = [n for n in names if any(k in n.lower() for k in ["qwen", "phi", "llama", "mistral", "gemma"])]
                    active_model = matched[0] if matched else names[0]
        except Exception:
            pass

        system_prompt = (
            "You are a strict security scanner. Scan the user context input for any sensitive credentials, AWS keys, secret tokens, private keys, database connection strings, passwords, or company confidential terms.\n"
            "Return a JSON array of findings. Each object in the array must contain:\n"
            "- \"label\": (string, e.g. \"AWS access key\")\n"
            "- \"severity\": (string, either \"high\" or \"medium\")\n"
            "- \"match\": (string, the exact matched characters to redact)\n"
            "- \"recommendation\": (string, fix description)\n"
            "Return ONLY the valid JSON array. Do not include markdown code block syntax (like ```json), intro text, or extra descriptions."
        )

        payload = {
            "model": active_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "stream": False,
            "format": "json"
        }

        try:
            res = requests.post("http://localhost:11434/api/chat", json=payload, timeout=12.0)
            if res.status_code == 200:
                response_json = res.json()
                message_content = response_json.get("message", {}).get("content", "").strip()

                try:
                    findings = json.loads(message_content)
                    if isinstance(findings, dict) and "findings" in findings:
                        findings = findings["findings"]
                    if not isinstance(findings, list):
                        findings = []

                    cleaned_findings = []
                    for idx, item in enumerate(findings):
                        if not isinstance(item, dict):
                            continue
                        cleaned_findings.append({
                            "id": f"ollama-{idx}",
                            "label": item.get("label", "Sensitive Info Detected"),
                            "severity": item.get("severity", "medium").lower() if item.get("severity") in ["high", "medium"] else "medium",
                            "line": 1,
                            "start": 0,
                            "end": 0,
                            "match": item.get("match", ""),
                            "recommendation": item.get("recommendation", "Review or replace this content before sharing.")
                        })

                    return jsonify({"success": True, "findings": cleaned_findings})
                except Exception as parse_err:
                    current_app.logger.warning("Failed to parse Ollama JSON response: %s", str(parse_err))
                    return jsonify({"success": True, "findings": []})
            else:
                return jsonify({"success": False, "error": "ollama_server_error", "message": f"HTTP {res.status_code}"})
        except requests.exceptions.RequestException as req_err:
            current_app.logger.warning("Ollama connection failed: %s", str(req_err))
            return jsonify({"success": False, "error": "ollama_offline", "message": "Ollama server is offline or unreachable."})

    except Exception:
        current_app.logger.exception("Error checking leaks with Ollama")
        return jsonify({"success": False, "error": "internal"}), 500
