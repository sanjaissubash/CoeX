#!/usr/bin/env python3
import os
import sys
PY = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PY not in sys.path:
    sys.path.insert(0, PY)

from backend import create_app
from backend.database import db
from backend.models import Project, ContextBlock

app = create_app()

with app.app_context():
    prods = Project.query.all()
    print(f"Found {len(prods)} projects in DB ({app.config.get('SQLALCHEMY_DATABASE_URI')})")
    for p in prods:
        cb_count = ContextBlock.query.filter_by(project_id=p.id).count()
        print(f"- {p.id} | {p.name!r} | health={p.health_score} | context_blocks={cb_count}")
