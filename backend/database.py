from flask_sqlalchemy import SQLAlchemy
from pathlib import Path
from sqlalchemy import text

db = SQLAlchemy()


def init_db(app=None):
    """Initialize database, create tables, and ensure storage directories.

    If `app` is provided, this will use app.config to find the DB path and
    storage root. Otherwise it will use defaults.
    """
    # Ensure storage directories exist
    project_root = Path(__file__).parent.parent
    storage_dir = project_root / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)
    (storage_dir / "families").mkdir(exist_ok=True)
    (storage_dir / "projects").mkdir(exist_ok=True)
    (storage_dir / "exports").mkdir(exist_ok=True)
    (storage_dir / "uploads").mkdir(exist_ok=True)
    print(f"✅ Storage directories created at: {storage_dir}")

    # Initialize DB tables. The SQLAlchemy instance should be initialized
    # by the application (db.init_app(app)) before calling init_db, so
    # avoid calling db.init_app here to prevent double-registration.
    if app is not None:
        with app.app_context():
            db.create_all()
    else:
        db.create_all()
    print("✅ Database tables created")

    # Runtime migration: if the assets table exists but lacks folder_id column,
    # add it. This keeps local development simple without requiring Alembic.
    try:
        engine = db.engine
        with engine.connect() as conn:
            res = conn.execute(text("""
                SELECT name FROM sqlite_master WHERE type='table' AND name='assets'
            """))
            if res.fetchone():
                cols = conn.execute(text("PRAGMA table_info('assets')")).fetchall()
                col_names = [c[1] for c in cols]
                if 'folder_id' not in col_names:
                    print('Adding missing column assets.folder_id')
                    conn.execute(text("ALTER TABLE assets ADD COLUMN folder_id INTEGER"))
                    conn.commit()
                    print('✅ assets.folder_id added')
    except Exception as e:
        print('DB migration check failed:', e)
