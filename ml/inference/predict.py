import os
import pandas as pd
import joblib

# Determine absolute path for robust loading regardless of cwd
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "crowd_forecast_model.pkl")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "models", "preprocessor.pkl")

# Lazy loading to avoid blocking module initialization
_model = None
_preprocessor = None

def load_artifacts():
    global _model, _preprocessor
    if _model is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROCESSOR_PATH):
            raise FileNotFoundError("Model artifacts not found. Please train the model first.")
        _model = joblib.load(MODEL_PATH)
        _preprocessor = joblib.load(PREPROCESSOR_PATH)

def predict_crowd(features: dict) -> dict:
    """
    Predicts the stadium zone occupancy 10 minutes into the future.
    
    Expected features dict:
    {
        "zone_id": "ZONE_A",
        "current_occupancy": 3500,
        "entry_rate": 45,
        "exit_rate": 10,
        "event_phase": "first-half",
        "weather": "clear",
        "day_of_week": "Monday",
        "gate_status": "open",
        "security_level": "medium",
        "hour": 18
    }
    """
    load_artifacts()
    
    # Convert single prediction dict to DataFrame
    df = pd.DataFrame([features])
    
    # If hour is not provided, try to extract from a timestamp, or default
    if "hour" not in df.columns:
        if "timestamp" in df.columns:
            df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
        else:
            df["hour"] = 12 # Default fallback
            
    # Keep only the features used during training
    expected_cols = [
        'zone_id', 'event_phase', 'weather', 'day_of_week', 
        'gate_status', 'security_level', 'current_occupancy', 
        'entry_rate', 'exit_rate', 'hour'
    ]
    
    # Fill missing columns with defaults if necessary to avoid errors
    for col in expected_cols:
        if col not in df.columns:
            df[col] = 0 if col in ['current_occupancy', 'entry_rate', 'exit_rate', 'hour'] else "unknown"
            
    # Apply preprocessing
    X_prep = _preprocessor.transform(df[expected_cols])
    
    # Predict
    prediction = _model.predict(X_prep)[0]
    
    # Ensure prediction is physically possible (no negative people)
    prediction = max(0, int(round(prediction)))
    
    # Calculate Risk Level based on predicted occupancy
    if prediction > 4500:
        risk_level = "HIGH"
    elif prediction > 2500:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
        
    # Heuristic confidence calculation
    volatility = df['entry_rate'].iloc[0] + df['exit_rate'].iloc[0]
    confidence = round(max(0.60, min(0.95, 1.0 - (volatility / 1500.0))), 2)

    return {
        "predicted_occupancy": prediction,
        "confidence": confidence,
        "risk_level": risk_level
    }
