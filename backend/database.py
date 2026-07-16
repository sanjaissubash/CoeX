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

    # Runtime migration: add any columns a table is missing (added to a model after
    # the table already existed on disk). Keeps local development simple without
    # requiring Alembic; db.create_all() only creates new tables, never alters existing ones.
    def _add_missing_columns(conn, table, new_cols):
        res = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=:t"
        ), {"t": table})
        if not res.fetchone():
            return
        cols = conn.execute(text(f"PRAGMA table_info('{table}')")).fetchall()
        col_names = [c[1] for c in cols]
        for col, ddl in new_cols.items():
            if col not in col_names:
                print(f'Adding missing column {table}.{col}')
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
                conn.commit()
                print(f'✅ {table}.{col} added')

    try:
        engine = db.engine
        with engine.connect() as conn:
            _add_missing_columns(conn, 'assets', {'folder_id': 'INTEGER'})
            _add_missing_columns(conn, 'cloudtrail_sources', {
                'regions': "TEXT DEFAULT 'us-east-1'",
                'connection_method': "TEXT DEFAULT 'local_role'",
                'role_arn': "TEXT",
                'external_id': "TEXT",
            })
            _add_missing_columns(conn, 'cloudtrail_watch_rules', {
                'check_interval_seconds': "INTEGER DEFAULT 300",
            })
    except Exception as e:
        print('DB migration check failed:', e)
