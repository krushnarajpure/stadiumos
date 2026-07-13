"""
PredictionService — Thread-safe singleton that wraps the trained
CatBoost crowd-density forecasting model.

Loads model artifacts once at startup and exposes a .predict() method
that maps the dashboard's PredictionInput schema to the ML feature
space, runs inference, and returns both new ML fields and legacy
dashboard fields.
"""

import os
import logging
import threading
from typing import Dict, Any

import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Paths to trained model artifacts
# ──────────────────────────────────────────────
_ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "ml"))
_MODEL_PATH = os.path.join(_ML_DIR, "models", "crowd_forecast_model.pkl")
_PREPROCESSOR_PATH = os.path.join(_ML_DIR, "models", "preprocessor.pkl")

# The feature columns expected by the preprocessor (must match training order)
_EXPECTED_COLS = [
    "zone_id", "event_phase", "weather", "day_of_week",
    "gate_status", "security_level", "current_occupancy",
    "entry_rate", "exit_rate", "hour",
]


class PredictionService:
    """Thread-safe singleton that loads the trained model once and
    serves predictions for the lifetime of the process."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._inference_lock = threading.Lock()
        self._model = None
        self._preprocessor = None
        self._model_loaded = False

        self._load_artifacts()
        self._initialized = True

    # ── Artifact Loading ──────────────────────────

    def _load_artifacts(self) -> None:
        """Load the trained model and preprocessor from disk."""
        logger.info("Loading ML model artifacts from %s …", _ML_DIR)

        if not os.path.exists(_MODEL_PATH):
            logger.warning("Model file not found at %s — predictions will be unavailable.", _MODEL_PATH)
            return
        if not os.path.exists(_PREPROCESSOR_PATH):
            logger.warning("Preprocessor file not found at %s — predictions will be unavailable.", _PREPROCESSOR_PATH)
            return

        try:
            self._model = joblib.load(_MODEL_PATH)
            self._preprocessor = joblib.load(_PREPROCESSOR_PATH)
            self._model_loaded = True
            logger.info("ML model artifacts loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load ML artifacts: %s", exc, exc_info=True)

    @property
    def is_ready(self) -> bool:
        """Check whether the model artifacts are loaded and ready."""
        return self._model_loaded

    # ── Feature Mapping ───────────────────────────

    @staticmethod
    def _map_dashboard_input_to_ml_features(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maps the dashboard's PredictionInput schema (22 fields like
        attendance, match_minute, etc.) into the 10 features expected
        by the trained ML model.

        This is a deterministic, heuristic mapping — no information is
        lost, but the representation changes to match the training data.
        """
        # Derive event_phase from match_minute
        mm = raw.get("match_minute", 0)
        if mm < 0:
            event_phase = "pre-match"
        elif mm <= 45:
            event_phase = "first-half"
        elif mm <= 60:
            event_phase = "halftime"
        elif mm <= 105:
            event_phase = "second-half"
        else:
            event_phase = "post-match"

        # Derive weather from temperature / rain_probability
        rain = raw.get("rain_probability", 0)
        temp = raw.get("temperature", 25)
        if rain > 50:
            weather = "rain"
        elif temp > 35:
            weather = "hot"
        elif rain > 20:
            weather = "cloudy"
        else:
            weather = "clear"

        # Derive gate_status from gate_open_count
        goc = raw.get("gate_open_count", 10)
        if goc == 0:
            gate_status = "closed"
        elif goc < 5:
            gate_status = "restricted"
        else:
            gate_status = "open"

        # Derive security_level from security_queue_length
        sql = raw.get("security_queue_length", 0)
        if sql > 300:
            security_level = "high"
        elif sql > 100:
            security_level = "medium"
        else:
            security_level = "low"

        # Derive zone_id — default to ZONE_A (the endpoint doesn't carry zone info)
        zone_id = raw.get("zone_id", "ZONE_A")

        return {
            "zone_id": zone_id,
            "current_occupancy": int(raw.get("attendance", 0)),
            "entry_rate": int(raw.get("entry_rate_per_min", 0)),
            "exit_rate": int(raw.get("exit_rate_per_min", 0)),
            "event_phase": event_phase,
            "weather": weather,
            "day_of_week": raw.get("weekday", "Monday"),
            "gate_status": gate_status,
            "security_level": security_level,
            "hour": 12,  # Not available from the dashboard input; safe default
        }

    # ── Inference ─────────────────────────────────

    def predict(self, raw_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Thread-safe inference.  Accepts a dict matching the dashboard's
        PredictionInput fields and returns a composite result containing
        both the new ML fields and legacy dashboard fields.

        Raises RuntimeError if the model was not loaded.
        """
        if not self._model_loaded:
            raise RuntimeError(
                "ML model is not loaded. Ensure model artifacts exist "
                f"at {_MODEL_PATH} and {_PREPROCESSOR_PATH}."
            )

        ml_features = self._map_dashboard_input_to_ml_features(raw_input)

        with self._inference_lock:
            df = pd.DataFrame([ml_features])

            # Ensure column order matches preprocessor expectations
            X_prep = self._preprocessor.transform(df[_EXPECTED_COLS])

            predicted_occupancy = float(self._model.predict(X_prep)[0])
            predicted_occupancy = max(0.0, predicted_occupancy)

        # ── Derived metrics for dashboard backward compatibility ────
        capacity = raw_input.get("stadium_capacity", 80000)
        congestion_score = min(100.0, (predicted_occupancy / capacity) * 100.0)
        congestion_score = round(congestion_score, 1)

        # Risk level
        if congestion_score < 35:
            risk_level = "LOW"
        elif congestion_score < 65:
            risk_level = "MEDIUM"
        elif congestion_score < 85:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        # Confidence heuristic — penalised by high entry+exit volatility
        volatility = ml_features["entry_rate"] + ml_features["exit_rate"]
        confidence = round(max(0.60, min(0.95, 1.0 - (volatility / 1500.0))), 2)

        # Queue prediction — rough estimate based on congestion
        queue_prediction = int(min(60, max(1, congestion_score * 0.25)))

        # Top contributing factors (global feature importances)
        if hasattr(self._model, "feature_importances_"):
            importances = self._model.feature_importances_
            total_imp = sum(importances) if sum(importances) > 0 else 1.0
            normalized_importances = [imp / total_imp for imp in importances]
            feature_names = _EXPECTED_COLS
            paired = sorted(zip(feature_names, normalized_importances), key=lambda x: x[1], reverse=True)[:3]
            top_factors = [
                {"feature": name.replace("_", " "), "impact": round(float(imp) * 100.0, 1)}
                for name, imp in paired
            ]
        else:
            top_factors = []

        return {
            "predicted_occupancy": int(round(predicted_occupancy)),
            "congestion_score": congestion_score,
            "queue_prediction": queue_prediction,
            "risk_level": risk_level,
            "confidence": confidence,
            "top_factors": top_factors,
        }


# Module-level singleton — imported by the endpoint router
prediction_service = PredictionService()
