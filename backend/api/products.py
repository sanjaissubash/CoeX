from flask import request, jsonify, current_app
from backend.api import api_bp
from backend.models import ContextBlock, Product, ProductTemplate, Task, Workspace, Family
from backend.database import db
from pathlib import Path
from werkzeug.utils import secure_filename
from backend.models import Asset, AssetFolder
from datetime import datetime
import json
from backend.services.activity_service import ActivityService


def _serialize(p: Product) -> dict:
    return p.to_dict()


def _ensure_product_folder(slug: str):
    root = Path(current_app.config.get("STORAGE_ROOT", "storage"))
    prod_dir = root / "products" / slug
    prod_dir.mkdir(parents=True, exist_ok=True)
    return str(prod_dir)


def _safe_path_parts(path: str) -> list[str]:
    return [secure_filename(part) for part in Path(path).parts if part not in ("", ".", "..")]


def _get_or_create_asset_folder(product_id: str, relative_dir: Path):
    parent_id = None
    current_parts = []
    folder = None

    for part in relative_dir.parts:
        if not part:
            continue
        current_parts.append(part)
        folder_path = "/".join(current_parts)
        folder = AssetFolder.query.filter_by(product_id=product_id, path=folder_path).first()
        if not folder:
            folder = AssetFolder(
                product_id=product_id,
                parent_id=parent_id,
                name=part,
                path=folder_path,
            )
            db.session.add(folder)
            db.session.flush()
        parent_id = folder.id

    return folder


def _loads_template_value(value):
    if not value:
        return []
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return []
    return value


def _apply_template_defaults(product: Product, template: ProductTemplate | None):
    if not template:
        return

    for item in _loads_template_value(template.default_tasks):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        db.session.add(Task(
            product_id=product.id,
            title=title,
            description=item.get("description"),
            priority=item.get("priority", "medium"),
        ))

    for item in _loads_template_value(template.default_context_blocks):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        db.session.add(ContextBlock(
            product_id=product.id,
            title=title,
            content=item.get("content", ""),
            block_type=item.get("block_type", "template"),
            priority=item.get("priority", 0),
        ))

    for folder in _loads_template_value(template.default_folder_structure):
        name = folder.get("name") if isinstance(folder, dict) else str(folder)
        if not name:
            continue
        path = secure_filename(name)
        db.session.add(AssetFolder(product_id=product.id, name=name, path=path))
        (Path(_ensure_product_folder(product.id)) / path).mkdir(parents=True, exist_ok=True)


@api_bp.route("/products/<pid>/assets", methods=["GET"])
def product_assets_list(pid):
    p = Product.query.get_or_404(pid)
    assets = Asset.query.filter_by(product_id=p.id).order_by(Asset.created_at.desc()).all()
    data = []
    for a in assets:
        data.append({
            "id": a.id,
            "folder_id": a.folder_id,
            "name": a.name,
            "file_path": a.file_path,
            "file_type": a.file_type,
            "size_bytes": a.size_bytes,
            "description": a.description,
            "created_at": a.created_at.isoformat(),
        })
    return jsonify({"success": True, "data": data})



@api_bp.route("/products/<pid>/asset-folders", methods=["GET"])
def product_asset_folders_list(pid):
    p = Product.query.get_or_404(pid)
    folders = AssetFolder.query.filter_by(product_id=p.id).order_by(AssetFolder.path.asc()).all()
    out = []
    for f in folders:
        out.append({"id": f.id, "name": f.name, "path": f.path, "parent_id": f.parent_id})
    return jsonify({"success": True, "data": out})


@api_bp.route("/products/<pid>/asset-folders", methods=["POST"])
def product_asset_folders_create(pid):
    p = Product.query.get_or_404(pid)
    payload = request.get_json() or {}
    name = payload.get("name")
    parent_id = payload.get("parent_id")
    if not name:
        return jsonify({"success": False, "error": "name_required"}), 400

    # compute path: parent.path/name or name
    if parent_id:
        parent = AssetFolder.query.get_or_404(parent_id)
        path = f"{parent.path}/{secure_filename(name)}"
    else:
        path = secure_filename(name)

    folder = AssetFolder(product_id=p.id, parent_id=parent_id, name=name, path=path)
    db.session.add(folder)
    db.session.commit()

    # create folder on disk
    prod_folder = Path(_ensure_product_folder(str(p.id)))
    (prod_folder / path).mkdir(parents=True, exist_ok=True)

    return jsonify({"success": True, "data": {"id": folder.id, "name": folder.name, "path": folder.path}}), 201


@api_bp.route("/products/<pid>/assets", methods=["POST"])
def product_assets_upload(pid):
    p = Product.query.get_or_404(pid)
    if "file" not in request.files:
        return jsonify({"success": False, "error": "no_file"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "empty_filename"}), 400

    filename = secure_filename(file.filename)
    folder_id = request.form.get("folder_id")
    prod_folder = Path(_ensure_product_folder(str(p.id)))

    if folder_id:
        folder = AssetFolder.query.get_or_404(folder_id)
        upload_dir = prod_folder / folder.path
        upload_dir.mkdir(parents=True, exist_ok=True)
        dest = upload_dir / filename
        relative = str(dest.relative_to(Path(current_app.config.get("STORAGE_ROOT", "storage"))))
    else:
        dest = prod_folder / filename
    file.save(dest)

    # Create asset record
    asset = Asset(
        product_id=p.id,
        folder_id=(int(folder_id) if folder_id else None),
        name=filename,
        file_path=str(dest.relative_to(Path(current_app.config.get("STORAGE_ROOT", "storage")))),
        file_type=(file.mimetype or "unknown"),
        size_bytes=dest.stat().st_size,
    )
    db.session.add(asset)
    db.session.commit()

    return jsonify({"success": True, "data": {"id": asset.id, "name": asset.name, "file_path": asset.file_path}}), 201


@api_bp.route("/products/<pid>/assets/folder", methods=["POST"])
def product_assets_folder_upload(pid):
    p = Product.query.get_or_404(pid)
    files = request.files.getlist("files")
    relative_paths = request.form.getlist("relative_paths")
    folder_id = request.form.get("folder_id")

    if not files:
        return jsonify({"success": False, "error": "no_files"}), 400

    prod_folder = Path(_ensure_product_folder(str(p.id)))
    storage_root = Path(current_app.config.get("STORAGE_ROOT", "storage"))
    base_parts: list[str] = []

    if folder_id:
        selected_folder = AssetFolder.query.get_or_404(folder_id)
        if selected_folder.product_id != p.id:
            return jsonify({"success": False, "error": "folder_product_mismatch"}), 400
        base_parts = _safe_path_parts(selected_folder.path)

    created_assets = []
    created_folder_paths = set()

    for index, file in enumerate(files):
        if not file or file.filename == "":
            continue

        raw_relative = relative_paths[index] if index < len(relative_paths) else file.filename
        path_parts = _safe_path_parts(raw_relative)
        if not path_parts:
            continue

        filename = path_parts[-1]
        dir_parts = base_parts + path_parts[:-1]
        upload_dir = prod_folder.joinpath(*dir_parts)
        upload_dir.mkdir(parents=True, exist_ok=True)
        dest = upload_dir / filename
        file.save(dest)

        folder = _get_or_create_asset_folder(p.id, Path(*dir_parts)) if dir_parts else None
        if folder:
            created_folder_paths.add(folder.path)

        asset = Asset(
            product_id=p.id,
            folder_id=folder.id if folder else None,
            name=filename,
            file_path=str(dest.relative_to(storage_root)),
            file_type=(file.mimetype or "unknown"),
            size_bytes=dest.stat().st_size,
        )
        db.session.add(asset)
        created_assets.append(asset)

    if not created_assets:
        db.session.rollback()
        return jsonify({"success": False, "error": "no_valid_files"}), 400

    db.session.commit()

    return jsonify({
        "success": True,
        "data": {
            "asset_count": len(created_assets),
            "folder_count": len(created_folder_paths),
            "assets": [
                {"id": asset.id, "name": asset.name, "file_path": asset.file_path}
                for asset in created_assets
            ],
        },
    }), 201


@api_bp.route("/products/<pid>/assets/download/<asset_id>", methods=["GET"])
def product_asset_download(pid, asset_id):
    p = Product.query.get_or_404(pid)
    asset = Asset.query.get_or_404(asset_id)
    # Try several candidate storage roots to locate the file. The app may be
    # started from different working directories or config values, so check
    # (1) configured STORAGE_ROOT
    # (2) repo root/storage (relative to this file)
    # (3) current working dir / storage
    candidates = []
    configured = current_app.config.get("STORAGE_ROOT")
    if configured:
        candidates.append(Path(configured))
    # repo root / storage
    repo_root = Path(__file__).parent.parent
    candidates.append(repo_root / "storage")
    # cwd / storage
    candidates.append(Path.cwd() / "storage")

    file_full = None
    for root in candidates:
        candidate = root / asset.file_path
        if candidate.exists():
            file_full = candidate
            break

    if not file_full:
        current_app.logger.error("Asset file not found; checked paths: %s", [str(p) for p in candidates])
        return jsonify({"success": False, "error": "file_not_found"}), 404

    # send file using send_file. Provide an explicit mimetype and handle
    # inline vs attachment responses separately so browsers consistently
    # render previews instead of downloading.
    import mimetypes
    from flask import send_file
    inline = request.args.get('inline', '')
    want_inline = bool(inline and inline.lower() in ("1", "true", "yes"))

    # Determine mimetype: prefer stored asset.file_type, otherwise guess from filename
    mimetype = asset.file_type or mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'

    if want_inline:
        # Inline rendering: do not set attachment, set mimetype explicitly
        return send_file(str(file_full), mimetype=mimetype, as_attachment=False)
    else:
        # Force download; provide filename
        return send_file(str(file_full), mimetype=mimetype, as_attachment=True, download_name=asset.name)


@api_bp.route("/products/", methods=["GET"])
def products_list():
    prods = Product.query.all()
    return jsonify({"success": True, "data": [_serialize(p) for p in prods]})


@api_bp.route("/products/", methods=["POST"])
def products_create():
    payload = request.get_json() or {}
    name = payload.get("name")
    family_id = payload.get("family_id")
    if not name or not family_id:
        return jsonify({"success": False, "error": "name and family_id are required"}), 400
    # single global workspace: ensure one exists and use it for created products
    ws = Workspace.query.first()
    if not ws:
        ws = Workspace(name="Default Workspace")
        db.session.add(ws)
        db.session.commit()

    fam = Family.query.get_or_404(family_id)
    p = Product(workspace_id=ws.id, family_id=fam.id, name=name, description=payload.get("description"))
    template = None
    template_id = payload.get("template_id")
    if template_id:
        template = ProductTemplate.query.get(template_id)
        if template:
            p.template_id = template.id
    if payload.get("lifecycle"):
        p.lifecycle = payload["lifecycle"]
    if payload.get("status"):
        p.status = payload["status"]
    db.session.add(p)
    db.session.commit()

    # create product folder using the product id (UUID)
    _ensure_product_folder(str(p.id))
    _apply_template_defaults(p, template)
    db.session.commit()
    ActivityService.log_action(
        product_id=p.id,
        action="CREATED",
        entity_type="Product",
        entity_id=p.id,
        details={"title": p.name},
    )

    return jsonify({"success": True, "data": _serialize(p)}), 201


@api_bp.route("/products/<pid>", methods=["GET"])
def products_get(pid):
    p = Product.query.get_or_404(pid)
    return jsonify({"success": True, "data": _serialize(p)})


@api_bp.route("/products/<pid>", methods=["PATCH"])
def products_patch(pid):
    p = Product.query.get_or_404(pid)
    payload = request.get_json() or {}
    for key in ("name", "description", "lifecycle", "status", "health_score"):
        if key in payload:
            setattr(p, key, payload[key])
    if payload.get("status") == "ARCHIVED" and not p.archived_at:
        p.archived_at = datetime.utcnow()
    elif payload.get("status") == "ACTIVE":
        p.archived_at = None
    p.updated_at = datetime.utcnow()
    db.session.commit()
    ActivityService.log_action(
        product_id=p.id,
        action="UPDATED",
        entity_type="Product",
        entity_id=p.id,
        details={"updated_fields": list(payload.keys()), "title": p.name},
    )
    return jsonify({"success": True, "data": _serialize(p)})


@api_bp.route("/products/<pid>", methods=["DELETE"])
def products_delete(pid):
    p = Product.query.get_or_404(pid)
    product_name = p.name
    db.session.delete(p)
    db.session.commit()
    return jsonify({"success": True, "message": f"{product_name} deleted"})
