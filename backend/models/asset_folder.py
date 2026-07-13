from datetime import datetime
from backend.database import db


class AssetFolder(db.Model):
    __tablename__ = "asset_folders"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("asset_folders.id"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    path = db.Column(db.String(1000), nullable=False)  # relative path within product folder

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parent = db.relationship("AssetFolder", remote_side=[id], backref="children")
