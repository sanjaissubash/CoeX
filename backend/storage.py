from pathlib import Path
import os


def ensure_storage_dirs(root: str | Path):
    root_path = Path(root)
    dirs = ["families", "projects", "uploads", "exports"]
    root_path.mkdir(parents=True, exist_ok=True)
    for d in dirs:
        (root_path / d).mkdir(exist_ok=True)


if __name__ == "__main__":
    default_root = Path(__file__).parent.parent / "storage"
    ensure_storage_dirs(default_root)
    print(f"✅ Storage dirs ensured at: {default_root}")
