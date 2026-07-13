import os
import sys
import logging

# Set PYTHONPATH to root of project workspace
sys.path.append("/Users/hasininc/StadiumOS")

from ml.preprocessing.generator import generate_synthetic_data
from ml.preprocessing.pipeline import preprocess_dataset
from ml.training.train import train_and_compare_models
from ml.evaluation.evaluator import evaluate_ml_pipeline

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def execute_pipeline() -> None:
    logger.info("=========================================")
    logger.info("STADIUMOS MACHINE LEARNING PIPELINE START")
    logger.info("=========================================")
    
    # Step 1: Synthetic Dataset Generation
    logger.info("[STEP 1/4] Generating synthetic telemetry dataset...")
    generate_synthetic_data(num_rows=105000, output_path="/Users/hasininc/StadiumOS/ml/datasets/synthetic_stadium_data.csv")
    
    # Step 2: Data Preprocessing and Imputation Transformers
    logger.info("[STEP 2/4] Executing preprocessing, imputation, and scaling...")
    preprocessed_data = preprocess_dataset(
        data_path="/Users/hasininc/StadiumOS/ml/datasets/synthetic_stadium_data.csv",
        save_dir="/Users/hasininc/StadiumOS/ml/preprocessing"
    )
    
    # Step 3: Model Comparison & Training
    logger.info("[STEP 3/4] Training and comparing models (Random Forest, XGBoost, LightGBM, CatBoost, Gradient Boosting, Extra Trees)...")
    training_outputs = train_and_compare_models(
        preprocessed_data=preprocessed_data,
        models_dir="/Users/hasininc/StadiumOS/ml/models"
    )
    
    # Step 4: Metric Evaluation & Local Explainability
    logger.info("[STEP 4/4] Generating MAE/RMSE/R2 regression scores, classification accuracy, SHAP value maps, and permutation importance...")
    evaluate_ml_pipeline(
        preprocessed_data=preprocessed_data,
        models_dir="/Users/hasininc/StadiumOS/ml/models",
        output_dir="/Users/hasininc/StadiumOS/ml/evaluation"
    )
    
    logger.info("=========================================")
    logger.info("STADIUMOS MACHINE LEARNING PIPELINE COMPLETE")
    logger.info("=========================================")

if __name__ == "__main__":
    execute_pipeline()
