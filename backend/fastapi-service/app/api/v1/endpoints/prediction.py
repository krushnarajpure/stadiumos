"""
Prediction endpoint — POST /api/v1/predict/crowd

Accepts live matchday indicators from the ops dashboard, runs them
through the trained CatBoost crowd-density model, and returns
congestion metrics, risk level, confidence, and contributing factors.
"""

import time
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.services.prediction_service import prediction_service

logger = logging.getLogger("fastapi")
router = APIRouter()


# ──────────────────────────────────────────────
# Pydantic Request / Response Schemas
# ──────────────────────────────────────────────

class PredictionInput(BaseModel):
    """Live matchday telemetry sent by the ops dashboard."""

    attendance: int = Field(
        ..., ge=0, le=100000,
        description="Current match attendance",
        json_schema_extra={"example": 64200},
    )
    stadium_capacity: int = Field(
        ..., ge=10000, le=120000,
        description="Total seating capacity",
        json_schema_extra={"example": 80000},
    )
    match_minute: int = Field(
        ..., ge=-90, le=150,
        description="Match clock minute (negative = pre-match)",
        json_schema_extra={"example": 58},
    )
    entry_rate_per_min: float = Field(
        ..., ge=0.0, le=2000.0,
        description="Gate entries per minute",
        json_schema_extra={"example": 420.0},
    )
    exit_rate_per_min: float = Field(
        ..., ge=0.0, le=2000.0,
        description="Gate exits per minute",
        json_schema_extra={"example": 115.0},
    )
    temperature: float = Field(
        ..., ge=-20.0, le=55.0,
        description="Air temperature in degrees Celsius",
        json_schema_extra={"example": 31.0},
    )
    humidity: float = Field(
        ..., ge=0.0, le=100.0,
        description="Humidity percentage",
        json_schema_extra={"example": 63.0},
    )
    rain_probability: float = Field(
        ..., ge=0.0, le=100.0,
        description="Rain probability percentage",
        json_schema_extra={"example": 10.0},
    )
    parking_occupancy: float = Field(
        ..., ge=0.0, le=100.0,
        description="Parking occupancy rate percentage",
        json_schema_extra={"example": 74.0},
    )
    metro_arrivals: int = Field(
        ..., ge=0, le=10000,
        description="Metro arrival rate in passengers/min",
        json_schema_extra={"example": 890},
    )
    bus_arrivals: int = Field(
        ..., ge=0, le=10000,
        description="Bus arrival rate in passengers/min",
        json_schema_extra={"example": 410},
    )
    ticket_scan_rate: float = Field(
        ..., ge=0.0, le=2000.0,
        description="Ticket validation scans per minute",
        json_schema_extra={"example": 370.0},
    )
    security_queue_length: float = Field(
        ..., ge=0.0, le=5000.0,
        description="Security queues count across checkpoints",
        json_schema_extra={"example": 185.0},
    )
    food_court_density: float = Field(
        ..., ge=0.0, le=100.0,
        description="Food concourse queue occupancy percentage",
        json_schema_extra={"example": 67.0},
    )
    restroom_density: float = Field(
        ..., ge=0.0, le=100.0,
        description="Restroom corridors occupancy percentage",
        json_schema_extra={"example": 49.0},
    )
    medical_incidents: int = Field(
        ..., ge=0, le=100,
        description="Active dispatcher medical events",
        json_schema_extra={"example": 2},
    )
    previous_congestion: float = Field(
        ..., ge=0.0, le=100.0,
        description="Past window congestion score",
        json_schema_extra={"example": 71.0},
    )
    gate_open_count: int = Field(
        ..., ge=1, le=100,
        description="Count of open entry gates",
        json_schema_extra={"example": 14},
    )
    vip_event: bool = Field(
        ...,
        description="VIP attendance security active flag",
        json_schema_extra={"example": False},
    )
    special_event: bool = Field(
        ...,
        description="Special high-interest match flag",
        json_schema_extra={"example": True},
    )
    holiday: bool = Field(
        ...,
        description="Holiday matchday schedule indicator",
        json_schema_extra={"example": False},
    )
    weekday: str = Field(
        ...,
        description="Name of the day of the week",
        json_schema_extra={"example": "Sunday"},
    )

    @field_validator("weekday")
    @classmethod
    def validate_weekday(cls, v: str) -> str:
        valid = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
        if v.lower() not in valid:
            raise ValueError("Weekday must be a valid day name (e.g. 'Monday', 'Sunday').")
        return v


class FactorImpact(BaseModel):
    """Single feature's contribution to the prediction."""

    feature: str = Field(..., description="Input feature name")
    impact: float = Field(..., description="Relative percentage contribution")


class PredictionOutput(BaseModel):
    """Composite response containing both new ML fields and legacy
    dashboard-compatible fields."""

    # New ML fields
    predicted_occupancy: int = Field(
        ...,
        description="Predicted crowd occupancy after 10 minutes",
        json_schema_extra={"example": 68500},
    )
    confidence: float = Field(
        ...,
        description="Prediction confidence score (0.0–1.0)",
        json_schema_extra={"example": 0.92},
    )

    # Legacy dashboard fields
    risk_level: str = Field(
        ...,
        description="Predicted risk band: LOW, MEDIUM, HIGH, CRITICAL",
        json_schema_extra={"example": "HIGH"},
    )
    congestion_score: float = Field(
        ...,
        description="Predicted congestion level (0–100)",
        json_schema_extra={"example": 85.6},
    )
    queue_prediction: int = Field(
        ...,
        description="Predicted average security wait time in minutes",
        json_schema_extra={"example": 18},
    )
    top_factors: List[FactorImpact] = Field(
        ...,
        description="Features that contributed most to the prediction",
    )
    timestamp: str = Field(
        ...,
        description="ISO-8601 timestamp of inference execution",
        json_schema_extra={"example": "2026-07-09T13:10:00Z"},
    )


# ──────────────────────────────────────────────
# API Route
# ──────────────────────────────────────────────

@router.post(
    "/crowd",
    response_model=PredictionOutput,
    status_code=status.HTTP_200_OK,
    summary="Predict Stadium Crowd Congestion Metrics",
    description=(
        "Feed live matchday indicators into the trained CatBoost model "
        "to receive predicted occupancy, congestion scores, queue wait "
        "estimates, risk level, confidence, and top contributing factors."
    ),
)
async def predict_crowd(payload: PredictionInput):
    """Run inference against the trained crowd-density model."""
    start = time.time()

    if not prediction_service.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not loaded. The prediction service is temporarily unavailable.",
        )

    try:
        result = prediction_service.predict(payload.model_dump())
        duration_ms = (time.time() - start) * 1000

        logger.info(
            "Prediction completed in %.2fms | Risk: %s | Congestion: %.1f | Confidence: %.2f",
            duration_ms,
            result["risk_level"],
            result["congestion_score"],
            result["confidence"],
        )

        return {
            **result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except RuntimeError as exc:
        logger.error("Model runtime error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Inference error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction pipeline failure: {exc}",
        )
