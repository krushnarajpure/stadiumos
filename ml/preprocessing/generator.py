import os
import logging
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_synthetic_data(num_rows: int = 105000, output_path: str = "/Users/hasininc/StadiumOS/ml/datasets/synthetic_stadium_data.csv") -> None:
    logger.info(f"Generating synthetic crowd data: {num_rows} rows...")
    np.random.seed(42)

    # 1. Base input features
    attendance = np.random.randint(30000, 80000, size=num_rows)
    stadium_capacity = np.full(num_rows, 80000)
    match_minute = np.random.randint(-60, 120, size=num_rows) # -60 prep match, 90 standard, up to 120 (extra time)
    
    # Ingress entry rate is higher before the match (-45 to 15 mins)
    entry_rate_per_min = np.zeros(num_rows)
    pre_match_mask = (match_minute >= -60) & (match_minute <= 15)
    entry_rate_per_min[pre_match_mask] = np.random.normal(300, 80, size=np.sum(pre_match_mask))
    entry_rate_per_min[~pre_match_mask] = np.random.normal(15, 10, size=np.sum(~pre_match_mask))
    entry_rate_per_min = np.clip(entry_rate_per_min, 0, 800)

    # Egress exit rate is higher after 80 mins
    exit_rate_per_min = np.zeros(num_rows)
    egress_mask = match_minute >= 80
    exit_rate_per_min[egress_mask] = np.random.normal(250, 70, size=np.sum(egress_mask))
    exit_rate_per_min[~egress_mask] = np.random.normal(5, 3, size=np.sum(~egress_mask))
    exit_rate_per_min = np.clip(exit_rate_per_min, 0, 800)

    temperature = np.random.normal(26, 5, size=num_rows)
    humidity = np.random.randint(40, 95, size=num_rows)
    rain_probability = np.random.uniform(0.0, 1.0, size=num_rows)
    
    parking_occupancy = np.clip(np.random.normal(70, 15, size=num_rows), 20, 100)
    
    # Inbound transport lines
    metro_arrivals = np.random.randint(100, 1200, size=num_rows)
    bus_arrivals = np.random.randint(50, 500, size=num_rows)
    
    ticket_scan_rate = np.clip(entry_rate_per_min * np.random.uniform(0.85, 0.98, size=num_rows), 0, 750)
    
    # Queue length correlates with entry rate and number of gates open
    gate_open_count = np.random.randint(8, 24, size=num_rows)
    security_queue_length = np.clip((entry_rate_per_min / gate_open_count) * np.random.uniform(20, 45, size=num_rows), 0, 500)
    
    food_court_density = np.clip(np.random.normal(60, 15, size=num_rows), 10, 100)
    restroom_density = np.clip(np.random.normal(55, 18, size=num_rows), 10, 100)
    medical_incidents = np.random.poisson(lam=1.2, size=num_rows)
    
    previous_congestion = np.clip(np.random.normal(45, 12, size=num_rows), 5, 100)
    
    vip_event = np.random.choice([0, 1], p=[0.9, 0.1], size=num_rows)
    special_event = np.random.choice([0, 1], p=[0.95, 0.05], size=num_rows)
    holiday = np.random.choice([0, 1], p=[0.85, 0.15], size=num_rows)
    weekday = np.random.choice([0, 1], p=[0.3, 0.7], size=num_rows)

    # 2. Simulate mathematical ground-truth dependencies for prediction targets
    # Congestion score regression target (0 - 100)
    raw_congestion = (
        (attendance / stadium_capacity) * 45 +
        (security_queue_length / 500) * 25 +
        (food_court_density / 100) * 10 +
        (entry_rate_per_min / 800) * 15 -
        (gate_open_count / 24) * 8 +
        (rain_probability > 0.7) * 8 +
        (vip_event * 5) + 
        (special_event * 6) +
        np.random.normal(0, 3, size=num_rows)
    )
    congestion_score = np.clip(raw_congestion, 0, 100)

    # Predicted Queue Time regression target (minutes)
    predicted_queue_time = np.clip(
        (security_queue_length / gate_open_count) * np.random.uniform(0.6, 1.1, size=num_rows) +
        (rain_probability > 0.6) * 4 +
        (medical_incidents * 2) +
        np.random.normal(0, 1, size=num_rows),
        1, 60
    )

    # Risk level classification target
    risk_level = []
    for c in congestion_score:
        if c < 35:
            risk_level.append("Low")
        elif c < 65:
            risk_level.append("Medium")
        elif c < 85:
            risk_level.append("High")
        else:
            risk_level.append("Critical")

    # Combine into pandas DataFrame
    df = pd.DataFrame({
        'attendance': attendance,
        'stadium_capacity': stadium_capacity,
        'match_minute': match_minute,
        'entry_rate_per_min': entry_rate_per_min,
        'exit_rate_per_min': exit_rate_per_min,
        'temperature': temperature,
        'humidity': humidity,
        'rain_probability': rain_probability,
        'parking_occupancy': parking_occupancy,
        'metro_arrivals': metro_arrivals,
        'bus_arrivals': bus_arrivals,
        'ticket_scan_rate': ticket_scan_rate,
        'security_queue_length': security_queue_length,
        'food_court_density': food_court_density,
        'restroom_density': restroom_density,
        'medical_incidents': medical_incidents,
        'previous_congestion': previous_congestion,
        'gate_open_count': gate_open_count,
        'vip_event': vip_event,
        'special_event': special_event,
        'holiday': holiday,
        'weekday': weekday,
        'congestion_score': congestion_score,
        'risk_level': risk_level,
        'predicted_queue_time': predicted_queue_time
    })

    # Add minor random NaN values (e.g. 0.5% missingness) to simulate real-world preprocessing requirements
    for col in ['temperature', 'humidity', 'parking_occupancy']:
        nan_indices = np.random.choice(df.index, size=int(num_rows * 0.005), replace=False)
        df.loc[nan_indices, col] = np.nan

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info(f"Dataset generated and written to {output_path} successfully. Shape: {df.shape}")

if __name__ == "__main__":
    generate_synthetic_data()
