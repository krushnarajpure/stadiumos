import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_liveness_probe():
    response = client.get("/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert data["service"] == "stadiumos-fastapi"

def test_readiness_probe():
    response = client.get("/health/readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ready", "unready"]
    assert "timestamp" in data
