# Machine Learning (ML) Forecasting Core

This directory contains the custom machine learning algorithms for StadiumOS:

## Directory Index
- `ml-service/`: A Python microservice serving predictive models (wait times, demand forecasts) using scikit-learn, XGBoost, and LightGBM.

## Core Guidelines
- Implement data validation steps in training pipelines.
- Evaluate models against F1-score and RMSE targets before deploying updates.
- Monitor models in the Vertex AI Feature Store to identify data drift.
