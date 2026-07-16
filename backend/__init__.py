from flask import Flask
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from .database import db, init_db
from flask_cors import CORS

# Load environment variables from backend/.env before importing config.
# This ensures SQLALCHEMY_DATABASE_URI and FLASK_ENV are honored when config.py is evaluated.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .config import config


def create_app(config_name: str = "default") -> Flask:
    cfg = config.get(config_name, config["default"])
    app = Flask(__name__)
    app.config.from_object(cfg)
    # Make routes accept both with and without trailing slashes to avoid
    # 308 Permanent Redirects when clients omit a trailing slash on POST/PUT.
    # This makes local dev and curl-based QA less error-prone.
    app.url_map.strict_slashes = False

    # Logging setup (basic file + console)
    log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, "app.log")
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    file_handler = logging.FileHandler(log_path)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(file_handler)
        root_logger.addHandler(console_handler)
    app.logger = logging.getLogger("backend.app")
    app.logger.info("Logging initialized, writing to %s", log_path)

    # Initialize extensions (bind SQLAlchemy to the app). Do not create
    # tables yet so tests can override configuration after create_app().
    db.init_app(app)

    # Enable CORS for API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints (import modules so route decorators run)
    from backend.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # Create DB tables and storage on the first incoming request. This
    # allows tests to set app.config (e.g. an in-memory DB URI) after
    # calling create_app() but before making requests.
    def _ensure_db_initialized():
        if not getattr(app, "_backend_db_initialized", False):
            with app.app_context():
                init_db(app)
            app._backend_db_initialized = True

    app.before_request(_ensure_db_initialized)

    # Start the CloudTrail watch-rule scheduler. Skipped in tests (TestingConfig
    # sets TESTING=True) so ad-hoc test scripts don't spin up background threads
    # against a throwaway DB. The DB is initialized eagerly here (rather than
    # waiting for the first HTTP request) since the scheduler's first tick can
    # fire before any request ever arrives.
    if not app.testing:
        with app.app_context():
            init_db(app)
        app._backend_db_initialized = True
        from backend.scheduler import start_cloudtrail_watch_scheduler
        start_cloudtrail_watch_scheduler(app)

    return app
