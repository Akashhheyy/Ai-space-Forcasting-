import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

from app.machine_learning.feature_engineering import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    build_feature_matrix,
    create_forecast_targets,
)
from app.utilities.config import settings
from app.utilities.exceptions import InsufficientDataError, ModelNotFoundError
from app.utilities.logging import get_logger

logger = get_logger(__name__)

MODEL_CANDIDATES = {
    "linear_regression": LinearRegression,
    "random_forest": lambda: RandomForestRegressor(
        n_estimators=100, max_depth=12, random_state=42, n_jobs=-1
    ),
    "xgboost": lambda: XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
    ),
}


class ModelRegistry:
    def __init__(self) -> None:
        self.artifacts_dir = settings.model_artifacts_path

    def artifact_path(self, model_name: str, horizon_minutes: int) -> Path:
        return self.artifacts_dir / f"{model_name}_h{horizon_minutes}.joblib"

    def metadata_path(self, horizon_minutes: int) -> Path:
        return self.artifacts_dir / f"best_model_h{horizon_minutes}.json"

    def save_model(self, model: Any, model_name: str, horizon_minutes: int) -> str:
        path = self.artifact_path(model_name, horizon_minutes)
        joblib.dump(model, path)
        logger.info("Saved model %s for horizon %d to %s", model_name, horizon_minutes, path)
        return str(path)

    def load_model(self, model_name: str, horizon_minutes: int) -> Any:
        path = self.artifact_path(model_name, horizon_minutes)
        if not path.exists():
            raise ModelNotFoundError(f"Model artifact not found: {path}")
        return joblib.load(path)

    def load_best_model_name(self, horizon_minutes: int) -> str:
        meta_path = self.metadata_path(horizon_minutes)
        if not meta_path.exists():
            raise ModelNotFoundError(f"No best model metadata for horizon {horizon_minutes}")
        with meta_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data["model_name"]

    def save_best_model_metadata(
        self, model_name: str, horizon_minutes: int, metrics: dict[str, float]
    ) -> None:
        meta_path = self.metadata_path(horizon_minutes)
        payload = {
            "model_name": model_name,
            "horizon_minutes": horizon_minutes,
            "metrics": metrics,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        with meta_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)


class ModelTrainer:
    def __init__(self) -> None:
        self.registry = ModelRegistry()

    def prepare_training_data(self, df: pd.DataFrame, horizon_minutes: int) -> pd.DataFrame:
        featured = build_feature_matrix(df)
        return create_forecast_targets(featured, horizon_minutes)

    def train_and_evaluate(
        self, df: pd.DataFrame, horizon_minutes: int
    ) -> list[dict[str, Any]]:
        training_df = self.prepare_training_data(df, horizon_minutes)
        if len(training_df) < settings.min_training_samples:
            raise InsufficientDataError(
                f"Need at least {settings.min_training_samples} samples, got {len(training_df)}"
            )

        target_col = f"target_{horizon_minutes}m"
        X = training_df[FEATURE_COLUMNS]
        y = training_df[target_col]

        split_idx = int(len(training_df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        results: list[dict[str, Any]] = []

        for model_name, factory in MODEL_CANDIDATES.items():
            model = factory()
            model.fit(X_train, y_train)
            predictions = model.predict(X_test)

            mae = float(mean_absolute_error(y_test, predictions))
            rmse = float(mean_squared_error(y_test, predictions) ** 0.5)
            r2 = float(r2_score(y_test, predictions))

            artifact_path = self.registry.save_model(model, model_name, horizon_minutes)

            results.append(
                {
                    "model_name": model_name,
                    "horizon_minutes": horizon_minutes,
                    "mae": mae,
                    "rmse": rmse,
                    "r2_score": r2,
                    "training_samples": len(training_df),
                    "artifact_path": artifact_path,
                    "trained_at": datetime.now(timezone.utc),
                }
            )
            logger.info(
                "Trained %s (h=%dm): MAE=%.4f RMSE=%.4f R²=%.4f",
                model_name,
                horizon_minutes,
                mae,
                rmse,
                r2,
            )

        return results

    def select_best_model(self, results: list[dict[str, Any]]) -> dict[str, Any]:
        return min(results, key=lambda r: r["rmse"])
