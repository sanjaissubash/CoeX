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
import os


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

        mode = request.args.get("mode", "standard")
        if mode == "draft_internal":
            mode_instruction = "INTERNAL UPDATE MODE: Draft a concise, technical message (for Slack/Teams) to update the internal team on the progress and status of this ticket based on the provided context."
        elif mode == "draft_client":
            mode_instruction = "CLIENT UPDATE MODE: Draft a professional, clear message (for Slack/Teams) to update the client on what was fixed, updated, or configured. Ensure tone is appropriate for external communication."
        elif mode == "readonly_checks":
            mode_instruction = "READONLY CHECKS MODE: Provide strictly non-destructive commands or scripts (e.g., for AWS CloudShell or direct server access) to check the application configuration, find logs, or verify the current state. Do not include modifying commands."
        elif mode == "troubleshoot":
            mode_instruction = "TROUBLESHOOTING MODE: Provide a comprehensive troubleshooting plan. You MUST include: 1) Readonly commands to confirm the issue and gather proof/logs, 2) Exact backup commands and quick restore steps to safely revert, and 3) Post-verification checks to ensure the fix worked."
        elif mode == "setup_manual":
            mode_instruction = "MANUAL SETUP MODE: Provide a plan to manually configure the new setup. You MUST include: 1) Readonly compatibility and prerequisite checks on the server/infra, 2) Step-by-step instructions for the Cloud console (AWS/Azure) or server commands, and 3) An estimated cost review."
        elif mode == "setup_iac":
            mode_instruction = "IaC SETUP MODE: Provide a code-based setup plan using Terraform/IaC. You MUST include: 1) Readonly compatibility and prerequisite checks, 2) The proper Git code flow (create feature branch, push code, create PR, merge after approval), and 3) An estimated cost review for the infrastructure."
        else:
            mode_instruction = "Use this context to answer my next request with continuity. If there are risks, dependencies, or missing inputs, call them out clearly before moving forward."

        parts.extend([
            "",
            "# How I Want You To Help",
            mode_instruction,
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

        mode = request.args.get("mode", "standard")
        if mode == "draft_internal":
            mode_instruction = "INTERNAL UPDATE MODE: Draft a concise, technical message (for Slack/Teams) to update the internal team on the progress and status of this ticket based on the provided context."
        elif mode == "draft_client":
            mode_instruction = "CLIENT UPDATE MODE: Draft a professional, clear message (for Slack/Teams) to update the client on what was fixed, updated, or configured. Ensure tone is appropriate for external communication."
        elif mode == "readonly_checks":
            mode_instruction = "READONLY CHECKS MODE: Provide strictly non-destructive commands or scripts (e.g., for AWS CloudShell or direct server access) to check the application configuration, find logs, or verify the current state. Do not include modifying commands."
        elif mode == "troubleshoot":
            mode_instruction = "TROUBLESHOOTING MODE: Provide a comprehensive troubleshooting plan. You MUST include: 1) Readonly commands to confirm the issue and gather proof/logs, 2) Exact backup commands and quick restore steps to safely revert, and 3) Post-verification checks to ensure the fix worked."
        elif mode == "setup_manual":
            mode_instruction = "MANUAL SETUP MODE: Provide a plan to manually configure the new setup. You MUST include: 1) Readonly compatibility and prerequisite checks on the server/infra, 2) Step-by-step instructions for the Cloud console (AWS/Azure) or server commands, and 3) An estimated cost review."
        elif mode == "setup_iac":
            mode_instruction = "IaC SETUP MODE: Provide a code-based setup plan using Terraform/IaC. You MUST include: 1) Readonly compatibility and prerequisite checks, 2) The proper Git code flow (create feature branch, push code, create PR, merge after approval), and 3) An estimated cost review for the infrastructure."
        else:
            mode_instruction = "Continue from this task context. Help me decide, implement, debug, write, or plan the next step based on the request I give after this prompt."

        parts.extend([
            "",
            "# How I Want You To Help",
            mode_instruction,
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
@api_bp.route("/context/execute-ollama", methods=["POST"])
def execute_ollama_workflow():
    try:
        data = request.get_json() or {}
        project_id = data.get("project_id")
        task_id = data.get("task_id")
        note_text = data.get("note_text", "")
        mode = data.get("mode", "draft_internal")
        action_type = data.get("action_type", "execute")

        if not project_id or not note_text:
            return jsonify({"success": False, "error": "missing_params", "message": "project_id and note_text are required"}), 400

        from backend.models import Project, Task, Prompt, ContextBlock, Decision
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"success": False, "error": "not_found", "message": "Project not found"}), 404

        import requests
        import json

        active_model = "qwen2.5:3b"
        try:
            list_res = requests.get("http://localhost:11434/api/tags", timeout=1.5)
            if list_res.status_code == 200:
                models_list = list_res.json().get("models", [])
                names = [m.get("name") for m in models_list]
                if names and active_model not in names:
                    matched = [n for n in names if any(k in n.lower() for k in ["qwen", "phi", "llama", "mistral", "gemma"])]
                    active_model = matched[0] if matched else names[0]
        except Exception:
            pass

        prompt_name = f"techie_{action_type}_{mode}"
        db_prompt = Prompt.query.filter_by(name=prompt_name).first()
        
        if db_prompt:
            system_prompt = db_prompt.prompt_text
            # Optional: update usage count
            db_prompt.usage_count += 1
            from backend.database import db
            db.session.commit()
        else:
            system_prompt = "You are a helpful technical assistant. Please answer the query based on the project context."

        task_context = ""
        if task_id:
            task = Task.query.get(task_id)
            if task:
                task_context = f"Task Context: {task.title} (Status: {task.status})\nTask Details: {task.description or 'No additional details'}\n\n"

        project_knowledge = ""
        cblocks = ContextBlock.query.filter_by(project_id=project.id).all()
        if cblocks:
            project_knowledge += "Project Knowledge Blocks:\n" + "\n".join([f"- {c.title}: {c.content}" for c in cblocks]) + "\n\n"
        
        decs = Decision.query.filter_by(project_id=project.id).all()
        if decs:
            project_knowledge += "Project Decisions:\n" + "\n".join([f"- {d.title}: {d.description} (Status: {d.status})" for d in decs]) + "\n\n"

        if action_type == "execute":
            user_instruction = f"Execute this request based strictly on the project context above:\n\n{note_text}"
        else:
            user_instruction = f"Use this project context and note to generate the AI prompt:\n\n{note_text}"

        if "@coex" in note_text:
            user_instruction += "\n\nCRITICAL INSTRUCTION: The user has placed a '@coex' tag in the text above. You MUST analyze the specific context, issue, or question immediately preceding the '@coex' tag. Your entire response should be a direct answer, review, or further steps addressing ONLY that specific portion."

        user_content = f"Project: {project.name}\nDescription: {project.description or 'None'}\n\n{project_knowledge}{task_context}{user_instruction}"

        payload = {
            "model": active_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "stream": False,
            "keep_alive": -1
        }

        try:
            res = requests.post("http://localhost:11434/api/chat", json=payload, timeout=45.0)
            if res.status_code == 200:
                response_json = res.json()
                message_content = response_json.get("message", {}).get("content", "").strip()
                return jsonify({"success": True, "draft": message_content})
            else:
                return jsonify({"success": False, "error": "ollama_server_error", "message": f"HTTP {res.status_code}"})
        except requests.exceptions.Timeout:
            return jsonify({"success": False, "error": "ollama_timeout", "message": "Ollama timed out."})
        except requests.exceptions.RequestException:
            return jsonify({"success": False, "error": "ollama_offline", "message": "Ollama server unreachable."})
    except Exception:
        current_app.logger.exception("Error drafting with Ollama")
        return jsonify({"success": False, "error": "internal"}), 500


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
            "format": "json",
            "keep_alive": -1
        }

        try:
            res = requests.post("http://localhost:11434/api/chat", json=payload, timeout=45.0)
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
        except requests.exceptions.Timeout as timeout_err:
            current_app.logger.warning("Ollama scan timed out: %s", str(timeout_err))
            return jsonify({
                "success": False, 
                "error": "ollama_timeout", 
                "message": "Ollama scan timed out. The model is loading or inference is slow on the server's CPU. Please try again."
            })
        except requests.exceptions.RequestException as req_err:
            current_app.logger.warning("Ollama connection failed: %s", str(req_err))
            return jsonify({"success": False, "error": "ollama_offline", "message": "Ollama server is offline or unreachable."})

    except Exception:
        current_app.logger.exception("Error checking leaks with Ollama")
        return jsonify({"success": False, "error": "internal"}), 500

@api_bp.route("/context/summarize-task", methods=["POST"])
def summarize_task():
    try:
        data = request.get_json() or {}
        note_text = data.get("note_text", "").strip()
        task_id = data.get("task_id", "").strip()

        if not note_text or not task_id:
            return jsonify({"success": False, "error": "Missing note_text or task_id"})

        task = Task.query.get(task_id)
        if not task:
            return jsonify({"success": False, "error": "Task not found"})

        ollama_url = os.environ.get("OLLAMA_API_URL", "http://127.0.0.1:11434")
        
        import requests
        
        # Dynamic model selection
        model = "qwen2.5:3b"
        try:
            list_res = requests.get(f"{ollama_url}/api/tags", timeout=1.5)
            if list_res.status_code == 200:
                models_list = list_res.json().get("models", [])
                names = [m.get("name") for m in models_list]
                if names and model not in names and "qwen2.5:3b" not in names:
                    matched = [n for n in names if any(k in n.lower() for k in ["qwen", "phi", "llama", "mistral", "gemma"])]
                    model = matched[0] if matched else names[0]
        except Exception:
            model = os.environ.get("OLLAMA_MODEL", "llama3")

        system_prompt = "You are an expert technical assistant. Your objective is to summarize the user's note into a highly concise, single-paragraph progress update. Output ONLY the summary paragraph directly. Do NOT include any conversational preambles, greetings, or conclusions."

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Summarize this note to update the task:\n\n{note_text}"}
            ],
            "stream": False
        }

        try:
            res = requests.post(f"{ollama_url}/api/chat", json=payload, timeout=60)
            if res.status_code == 200:
                result = res.json()
                summary = result.get("message", {}).get("content", "").strip()
                if summary:
                    append_text = f"\n\n---\n**Update from Note:**\n{summary}"
                    if task.description:
                        task.description += append_text
                    else:
                        task.description = append_text
                    
                    db.session.commit()
                    return jsonify({"success": True, "summary": summary})
                else:
                    return jsonify({"success": False, "error": "Ollama returned empty response"})
            else:
                return jsonify({"success": False, "error": f"Ollama returned HTTP {res.status_code}"})
        except Exception as e:
            current_app.logger.warning("Ollama connection failed: %s", str(e))
            return jsonify({"success": False, "error": "Failed to connect to Ollama"})

    except Exception:
        current_app.logger.exception("Error summarizing task")
        return jsonify({"success": False, "error": "Internal server error"}), 500
