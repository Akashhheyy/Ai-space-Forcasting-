from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from app.machine_learning.feature_engineering import FEATURE_COLUMNS, build_feature_matrix
from app.machine_learning.trainer import ModelRegistry
from app.utilities.exceptions import InsufficientDataError, ModelNotFoundError, PredictionError
from app.utilities.logging import get_logger

logger = get_logger(__name__)


class RadiationPredictor:
    def __init__(self) -> None:
        self.registry = ModelRegistry()

    def predict_horizon(
        self, df: pd.DataFrame, horizon_minutes: int
    ) -> tuple[float, str, float]:
        if len(df) < 30:
            raise InsufficientDataError("Need at least 30 observations for prediction")

        featured = build_feature_matrix(df)
        latest = featured.iloc[[-1]][FEATURE_COLUMNS]

        try:
            best_model_name = self.registry.load_best_model_name(horizon_minutes)
            model = self.registry.load_model(best_model_name, horizon_minutes)
        except ModelNotFoundError:
            logger.warning("No trained model for horizon %d, using fallback", horizon_minutes)
            return self._fallback_prediction(df, horizon_minutes)

        prediction = float(model.predict(latest)[0])
        confidence = self._estimate_confidence(featured, prediction)
        return max(0.0, prediction), best_model_name, confidence

    def _fallback_prediction(self, df: pd.DataFrame, horizon_minutes: int) -> tuple[float, str, float]:
        recent = df["radiation_level"].tail(12)
        trend = recent.diff().mean() if len(recent) > 1 else 0.0
        steps = max(1, horizon_minutes // 5)
        base = float(df["radiation_level"].iloc[-1])
        predicted = base + (trend * steps)
        return max(0.0, predicted), "trend_fallback", 0.5

    def _estimate_confidence(self, featured: pd.DataFrame, prediction: float) -> float:
        recent_std = featured["radiation_level"].tail(24).std()
        if pd.isna(recent_std) or recent_std == 0:
            return 0.85
        deviation = abs(prediction - featured["radiation_level"].iloc[-1])
        confidence = max(0.5, min(0.99, 1.0 - (deviation / (recent_std * 3 + 1e-6))))
        return round(float(confidence), 4)

    def generate_all_forecasts(self, df: pd.DataFrame, horizons: list[int]) -> list[dict]:
        now = datetime.now(timezone.utc)
        forecasts = []

        for horizon in horizons:
            try:
                predicted, model_name, confidence = self.predict_horizon(df, horizon)
                forecasts.append(
                    {
                        "generated_at": now,
                        "forecast_for": now + timedelta(minutes=horizon),
                        "horizon_minutes": horizon,
                        "predicted_radiation": predicted,
                        "model_name": model_name,
                        "confidence_score": confidence,
                    }
                )
            except (InsufficientDataError, PredictionError) as exc:
                logger.error("Forecast failed for horizon %d: %s", horizon, exc)

        return forecasts
