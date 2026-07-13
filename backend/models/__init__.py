"""Expose model classes by importing the per-file modules in
`backend/models/`.

This package becomes the single import point for model classes.
We intentionally do not use the legacy single-file `backend/models.py`.
The per-file modules should define their declarative models. If a
module defines a table that already exists in the MetaData, SQLAlchemy
can be instructed to allow redefinition with `__table_args__ = {'extend_existing': True}`
in that model, but the preferred approach is to avoid duplicate
definitions entirely.
"""

from pathlib import Path
import importlib.util
import sys
import traceback

__all__ = []

# Load every .py file in this package (except __init__.py) as a module
# and re-export any class-like attribute that has a __tablename__.
pkg_dir = Path(__file__).parent
for p in sorted(pkg_dir.glob("*.py")):
    if p.name == "__init__.py":
        continue
    mod_name = f"backend.models.{p.stem}"
    spec = importlib.util.spec_from_file_location(mod_name, str(p))
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception:
        print(f"Failed importing {mod_name}", file=sys.stderr)
        traceback.print_exc()
        raise

    for attr in dir(mod):
        if attr.startswith("_"):
            continue
        val = getattr(mod, attr)
        if hasattr(val, "__tablename__"):
            globals()[attr] = val
            __all__.append(attr)



