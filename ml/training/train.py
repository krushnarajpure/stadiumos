import pandas as pd
import numpy as np
import os
import joblib
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor

# pyrefly: ignore [missing-import]
from xgboost import XGBRegressor

# pyrefly: ignore [missing-import]
from catboost import CatBoostRegressor

DATA_PATH = "ml/data/crowd_data.csv"
MODEL_DIR = "ml/models/"
MODEL_PATH = os.path.join(MODEL_DIR, "crowd_forecast_model.pkl")
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.pkl")
EVAL_REPORT_PATH = os.path.join(MODEL_DIR, "evaluation_report.txt")
FEAT_IMP_PATH = os.path.join(MODEL_DIR, "feature_importance.png")
PRED_VS_ACTUAL_PATH = os.path.join(MODEL_DIR, "pred_vs_actual.png")

def train_and_evaluate():
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    
    # Drop timestamp for simplicity in modeling, though time-features could be extracted
    # Day of week is already present. We could extract hour, but let's stick to the specs.
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    
    X = df.drop(columns=['timestamp', 'occupancy_after_10_minutes'])
    y = df['occupancy_after_10_minutes']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    categorical_features = ['zone_id', 'event_phase', 'weather', 'day_of_week', 'gate_status', 'security_level']
    numeric_features = ['current_occupancy', 'entry_rate', 'exit_rate', 'hour']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ])
    
    print("Fitting preprocessor...")
    X_train_prep = preprocessor.fit_transform(X_train)
    X_test_prep = preprocessor.transform(X_test)
    
    # Save preprocessor
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    
    # Get feature names for importance plotting later
    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_features)
    feature_names = numeric_features + list(cat_feature_names)
    
    models = {
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "XGBoost": XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "CatBoost": CatBoostRegressor(iterations=100, random_seed=42, verbose=0, thread_count=-1)
    }
    
    results = {}
    best_model_name = None
    best_mae = float('inf')
    best_model = None
    
    report_lines = ["# Crowd Density Forecasting - Evaluation Report\n"]
    
    print("Training models...")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_prep, y_train)
        preds = model.predict(X_test_prep)
        
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)
        
        results[name] = {'MAE': mae, 'RMSE': rmse, 'R2': r2}
        report_lines.append(f"## {name}")
        report_lines.append(f"MAE:  {mae:.2f}")
        report_lines.append(f"RMSE: {rmse:.2f}")
        report_lines.append(f"R2:   {r2:.4f}\n")
        
        if mae < best_mae:
            best_mae = mae
            best_model_name = name
            best_model = model
            
    report_lines.append(f"**Best Model**: {best_model_name} (MAE: {best_mae:.2f})")
    
    # Write report
    with open(EVAL_REPORT_PATH, "w") as f:
        f.write("\n".join(report_lines))
    print(f"Evaluation report saved to {EVAL_REPORT_PATH}")
    
    # Save best model
    joblib.dump(best_model, MODEL_PATH)
    print(f"Best model ({best_model_name}) saved to {MODEL_PATH}")
    
    # Feature Importance Plot
    print("Generating plots...")
    if hasattr(best_model, 'feature_importances_'):
        importances = best_model.feature_importances_
        indices = np.argsort(importances)[-15:] # Top 15
        
        plt.figure(figsize=(10, 6))
        plt.title(f'Feature Importances ({best_model_name})')
        plt.barh(range(len(indices)), importances[indices], color='b', align='center')
        plt.yticks(range(len(indices)), [feature_names[i] for i in indices])
        plt.xlabel('Relative Importance')
        plt.tight_layout()
        plt.savefig(FEAT_IMP_PATH)
        plt.close()
        
    # Pred vs Actual Plot
    best_preds = best_model.predict(X_test_prep)
    plt.figure(figsize=(8, 8))
    plt.scatter(y_test, best_preds, alpha=0.3, color='purple')
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    plt.xlabel('Actual Occupancy')
    plt.ylabel('Predicted Occupancy')
    plt.title(f'Predicted vs Actual Occupancy ({best_model_name})')
    plt.tight_layout()
    plt.savefig(PRED_VS_ACTUAL_PATH)
    plt.close()

if __name__ == "__main__":
    train_and_evaluate()
