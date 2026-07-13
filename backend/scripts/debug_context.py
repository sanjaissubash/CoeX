#!/usr/bin/env python3
"""Debug runner: call the context generator function directly inside app context
to capture exceptions and print traceback to stdout for debugging during development.
"""
import traceback
import sys

from backend import create_app

APP = create_app()


def run(project_id: str):
    with APP.app_context():
        # Import here so the module-level imports happen under app context
        from backend.api.context_generator import generate_project_context
        try:
            resp = generate_project_context(project_id)
            # Flask view functions may return (response, status) tuples; print repr
            print("Response:", repr(resp))
        except Exception:
            print("Exception when calling generate_project_context:\n")
            traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: debug_context.py <project_id>")
        sys.exit(2)
    run(sys.argv[1])
