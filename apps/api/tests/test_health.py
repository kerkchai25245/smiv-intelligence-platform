from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_liveness() -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["version"] == "0.1.0"


def test_protected_routes_require_authentication() -> None:
    for path in ("/api/v1/patients", "/api/v1/dashboard/summary", "/api/v1/intelligence/map"):
        response = client.get(path)
        assert response.status_code == 401
