import os
import pickle
import logging
import pandas as pd
from typing import Tuple, Dict, Any
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, LabelEncoder

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Numeric and categorical feature definitions
NUMERIC_FEATURES = [
    'attendance', 'stadium_capacity', 'match_minute', 'entry_rate_per_min',
    'exit_rate_per_min', 'temperature', 'humidity', 'rain_probability',
    'parking_occupancy', 'metro_arrivals', 'bus_arrivals', 'ticket_scan_rate',
    'security_queue_length', 'food_court_density', 'restroom_density',
    'medical_incidents', 'previous_congestion', 'gate_open_count'
]

BINARY_FEATURES = ['vip_event', 'special_event', 'holiday', 'weekday']

ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES

def build_preprocessing_pipeline() -> ColumnTransformer:
    logger.info("Building preprocessing pipeline...")
    
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    binary_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent'))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, NUMERIC_FEATURES),
            ('bin', binary_transformer, BINARY_FEATURES)
        ]
    )
    
    return preprocessor

def preprocess_dataset(
    data_path: str = "/Users/hasininc/StadiumOS/ml/datasets/synthetic_stadium_data.csv",
    save_dir: str = "/Users/hasininc/StadiumOS/ml/preprocessing"
) -> Dict[str, Any]:
    logger.info(f"Loading data for preprocessing from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Separate features and targets
    X = df[ALL_FEATURES]
    y_reg_congestion = df['congestion_score']
    y_reg_queue = df['predicted_queue_time']
    y_clf_risk = df['risk_level']
    
    # 1. Fit/Transform Preprocessor
    preprocessor = build_preprocessing_pipeline()
    X_processed = preprocessor.fit_transform(X)
    
    # 2. Encode categorical target variable (risk_level)
    label_encoder = LabelEncoder()
    y_clf_encoded = label_encoder.fit_transform(y_clf_risk)
    
    # 3. Train/Test Splits
    X_train, X_test, y_train_cong, y_test_cong = train_test_split(X_processed, y_reg_congestion, test_size=0.2, random_state=42)
    _, _, y_train_queue, y_test_queue = train_test_split(X_processed, y_reg_queue, test_size=0.2, random_state=42)
    _, _, y_train_risk, y_test_risk = train_test_split(X_processed, y_clf_encoded, test_size=0.2, random_state=42)
    
    # Ensure save directory exists
    os.makedirs(save_dir, exist_ok=True)
    
    # Save transformers
    preprocessor_path = os.path.join(save_dir, "preprocessor.pkl")
    label_encoder_path = os.path.join(save_dir, "label_encoder.pkl")
    
    with open(preprocessor_path, 'wb') as f:
        pickle.dump(preprocessor, f)
        
    with open(label_encoder_path, 'wb') as f:
        pickle.dump(label_encoder, f)
        
    logger.info(f"Transformers written to {save_dir} successfully.")
    
    return {
        'X_train': X_train,
        'X_test': X_test,
        'y_train_cong': y_train_cong.values,
        'y_test_cong': y_test_cong.values,
        'y_train_queue': y_train_queue.values,
        'y_test_queue': y_test_queue.values,
        'y_train_risk': y_train_risk,
        'y_test_risk': y_test_risk,
        'preprocessor': preprocessor,
        'label_encoder': label_encoder
    }

if __name__ == "__main__":
    preprocess_dataset()
