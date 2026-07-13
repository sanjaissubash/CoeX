import json
import sys
from pathlib import Path
import pytest

# ensure repo root is on sys.path for test discovery
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root))

from backend import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    app = create_app("default")
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["STORAGE_ROOT"] = str(tmp_path / "storage")

    with app.test_client() as c:
        with app.app_context():
            yield c


def test_ping(client):
    r = client.get("/api/ping")
    assert r.status_code == 200
    data = r.get_json()
    assert data["success"] is True


def test_family_crud(client):
    # create
    r = client.post("/api/families/", json={"name": "Templates"})
    assert r.status_code == 201
    data = r.get_json()["data"]
    fid = data["id"]

    # list
    r = client.get("/api/families/")
    assert r.status_code == 200
    assert any(f["id"] == fid for f in r.get_json()["data"]) 

    # get
    r = client.get(f"/api/families/{fid}")
    assert r.status_code == 200

    # update
    r = client.patch(f"/api/families/{fid}", json={"description": "Docs"})
    assert r.status_code == 200
    assert r.get_json()["data"]["description"] == "Docs"

    # delete
    r = client.delete(f"/api/families/{fid}")
    assert r.status_code == 200


def test_product_crud(client):
    # create family first
    r = client.post("/api/families/", json={"name": "Templates"})
    fid = r.get_json()["data"]["id"]

    # create product
    r = client.post("/api/products/", json={"name": "DevTrack OS", "family_id": fid})
    assert r.status_code == 201
    pid = r.get_json()["data"]["id"]

    # get
    r = client.get(f"/api/products/{pid}")
    assert r.status_code == 200

    # update
    r = client.patch(f"/api/products/{pid}", json={"lifecycle": "RESEARCH"})
    assert r.status_code == 200
    assert r.get_json()["data"]["lifecycle"] == "RESEARCH"

    # delete
    r = client.delete(f"/api/products/{pid}")
    assert r.status_code == 200
