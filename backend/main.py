import os
import sys
from pathlib import Path

# Add parent directory to path so 'backend' module is found
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend import create_app

if __name__ == "__main__":
    app = create_app(os.getenv("FLASK_ENV", "development"))
    app.run(debug=True, port=5001)
