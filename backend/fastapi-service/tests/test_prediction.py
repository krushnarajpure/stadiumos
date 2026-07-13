"""
Unit tests for POST /api/v1/predict/crowd

Covers:
  - Successful prediction with all required fields
  - Validation error for missing required fields
  - Response schema contract (new + legacy fields)
  - Model-unavailable scenario (503)
"""

import uuid

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# A valid payload matching the dashboard's PredictionInput schema
VALID_PAYLOAD = {
    "attendance": 64200,
    "stadium_capacity": 80000,
    "match_minute": 58,
    "entry_rate_per_min": 420,
    "exit_rate_per_min": 115,
    "temperature": 31,
    "humidity": 65,
    "rain_probability": 10,
    "parking_occupancy": 85,
    "metro_arrivals": 2100,
    "bus_arrivals": 500,
    "ticket_scan_rate": 800,
    "security_queue_length": 150,
    "food_court_density": 65,
    "restroom_density": 40,
    "medical_incidents": 2,
    "previous_congestion": 4,
    "gate_open_count": 8,
    "vip_event": True,
    "special_event": False,
    "holiday": False,
    "weekday": "Friday",
}


class TestPredictionEndpointSuccess:
    """Tests that assume the model is loaded and healthy."""

    def test_returns_200_with_valid_payload(self):
        req_id = str(uuid.uuid4())
        response = client.post(
            "/api/v1/predict/crowd",
            json=VALID_PAYLOAD,
            headers={"X-Request-ID": req_id},
        )
        assert response.status_code == 200, f"Unexpected error: {response.text}"
        # Verify X-Request-ID header is echoed
        assert response.headers.get("X-Request-ID") == req_id

    def test_response_contains_new_ml_fields(self):
        data = client.post("/api/v1/predict/crowd", json=VALID_PAYLOAD).json()
        assert "predicted_occupancy" in data
        assert "confidence" in data
        assert isinstance(data["predicted_occupancy"], int)
        assert 0.0 <= data["confidence"] <= 1.0

    def test_response_contains_legacy_dashboard_fields(self):
        data = client.post("/api/v1/predict/crowd", json=VALID_PAYLOAD).json()
        assert "congestion_score" in data
        assert "risk_level" in data
        assert "queue_prediction" in data
        assert "top_factors" in data
        assert "timestamp" in data

    def test_risk_level_is_valid_enum(self):
        data = client.post("/api/v1/predict/crowd", json=VALID_PAYLOAD).json()
        assert data["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    def test_top_factors_structure(self):
        data = client.post("/api/v1/predict/crowd", json=VALID_PAYLOAD).json()
        for factor in data["top_factors"]:
            assert "feature" in factor
            assert "impact" in factor


class TestPredictionEndpointValidation:
    """Tests for Pydantic request validation."""

    def test_missing_required_fields_returns_422(self):
        partial = {"attendance": 64200, "stadium_capacity": 80000}
        response = client.post("/api/v1/predict/crowd", json=partial)
        assert response.status_code == 422

    def test_invalid_weekday_returns_422(self):
        bad_payload = {**VALID_PAYLOAD, "weekday": "Notaday"}
        response = client.post("/api/v1/predict/crowd", json=bad_payload)
        assert response.status_code == 422

    def test_out_of_range_attendance_returns_422(self):
        bad_payload = {**VALID_PAYLOAD, "attendance": -1}
        response = client.post("/api/v1/predict/crowd", json=bad_payload)
        assert response.status_code == 422


class TestPredictionModelUnavailable:
    """Tests for graceful handling when the model is not loaded."""

    def test_returns_503_when_model_not_loaded(self):
        with patch(
            "app.api.v1.endpoints.prediction.prediction_service"
        ) as mock_service:
            mock_service.is_ready = False
            response = client.post("/api/v1/predict/crowd", json=VALID_PAYLOAD)
            assert response.status_code == 503
