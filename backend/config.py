import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

class Config:
    """Base configuration."""
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        f"sqlite:///{BASE_DIR}/storage/coex.db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STORAGE_ROOT = str(BASE_DIR / "storage")
    JSON_SORT_KEYS = False
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024
    TESTING = False

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
