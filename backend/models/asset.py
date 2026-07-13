from datetime import datetime
from backend.database import db


class Asset(db.Model):
    __tablename__ = "assets"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey("asset_folders.id"), nullable=True)
    
    name = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    folder = db.relationship("AssetFolder", backref="assets", lazy=True)
