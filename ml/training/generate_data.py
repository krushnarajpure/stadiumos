import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import os

def generate_crowd_data(num_records=50000, output_path="ml/data/crowd_data.csv"):
    np.random.seed(42)
    random.seed(42)

    # Base features
    timestamps = [datetime(2026, 6, 1) + timedelta(minutes=10 * i) for i in range(num_records)]
    
    zones = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "VIP_ZONE"]
    zone_ids = np.random.choice(zones, num_records)
    
    event_phases = ["pre-match", "first-half", "halftime", "second-half", "post-match"]
    phases = np.random.choice(event_phases, num_records, p=[0.2, 0.3, 0.1, 0.3, 0.1])
    
    weathers = ["clear", "rain", "cloudy", "hot"]
    weather = np.random.choice(weathers, num_records, p=[0.5, 0.1, 0.2, 0.2])
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_of_week = [ts.strftime("%A") for ts in timestamps]
    
    gate_statuses = ["open", "restricted", "closed"]
    gate_status = np.random.choice(gate_statuses, num_records, p=[0.8, 0.15, 0.05])
    
    security_levels = ["low", "medium", "high"]
    security_level = np.random.choice(security_levels, num_records, p=[0.6, 0.3, 0.1])
    
    # Continuous features
    current_occupancy = []
    entry_rate = []
    exit_rate = []
    occupancy_after_10_minutes = []

    for i in range(num_records):
        phase = phases[i]
        
        # Base logic for rates based on phase
        if phase == "pre-match":
            entry = np.random.poisson(200)
            exit_r = np.random.poisson(10)
            occ = np.random.randint(0, 1000)
        elif phase == "first-half" or phase == "second-half":
            entry = np.random.poisson(20)
            exit_r = np.random.poisson(20)
            occ = np.random.randint(3000, 5000)
        elif phase == "halftime":
            entry = np.random.poisson(300)
            exit_r = np.random.poisson(300)
            occ = np.random.randint(2000, 4500)
        else: # post-match
            entry = np.random.poisson(5)
            exit_r = np.random.poisson(400)
            occ = np.random.randint(1000, 5000)
            
        # Gate restrictions limit entry
        if gate_status[i] == "closed":
            entry = 0
        elif gate_status[i] == "restricted":
            entry = int(entry * 0.3)
            
        # Weather impacts
        if weather[i] == "rain":
            entry = int(entry * 0.8)
            
        current_occupancy.append(occ)
        entry_rate.append(entry)
        exit_rate.append(exit_r)
        
        # Target variable with some noise
        net_flow = entry - exit_r
        future_occ = max(0, occ + net_flow + np.random.normal(0, 50))
        occupancy_after_10_minutes.append(int(future_occ))
        
    df = pd.DataFrame({
        "timestamp": timestamps,
        "zone_id": zone_ids,
        "current_occupancy": current_occupancy,
        "entry_rate": entry_rate,
        "exit_rate": exit_rate,
        "event_phase": phases,
        "weather": weather,
        "day_of_week": day_of_week,
        "gate_status": gate_status,
        "security_level": security_level,
        "occupancy_after_10_minutes": occupancy_after_10_minutes
    })
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {num_records} records at {output_path}")

if __name__ == "__main__":
    generate_crowd_data()
