from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.machine_learning.predictor import RadiationPredictor
from app.machine_learning.trainer import ModelTrainer
from app.models.db_models import ModelMetric, RadiationForecast
from app.services.data_collector import SpaceWeatherRepository
from app.utilities.config import settings
from app.utilities.exceptions import InsufficientDataError
from app.utilities.logging import get_logger

logger = get_logger(__name__)


class ForecastingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SpaceWeatherRepository(db)
        self.predictor = RadiationPredictor()
        self.trainer = ModelTrainer()

    def train_models(self, force: bool = False) -> list[dict]:
        df = self.repository.get_dataframe()
        if len(df) < settings.min_training_samples:
            raise InsufficientDataError(
                f"Insufficient data for training: {len(df)}/{settings.min_training_samples}"
            )

        all_results: list[dict] = []
        best_models: list[str] = []

        for horizon in settings.forecast_horizons:
            results = self.trainer.train_and_evaluate(df, horizon)
            best = self.trainer.select_best_model(results)
            best_models.append(f"{best['model_name']}_h{horizon}")

            self.trainer.registry.save_best_model_metadata(
                best["model_name"],
                horizon,
                {"mae": best["mae"], "rmse": best["rmse"], "r2_score": best["r2_score"]},
            )

            self._persist_metrics(results, best["model_name"])
            all_results.extend(results)

        logger.info("Model training complete. Best models: %s", best_models)
        return all_results

    def _persist_metrics(self, results: list[dict], best_model_name: str) -> None:
        horizon = results[0]["horizon_minutes"]
        self.db.execute(
            update(ModelMetric)
            .where(ModelMetric.horizon_minutes == horizon)
            .values(is_best=False)
        )

        for result in results:
            metric = ModelMetric(
                model_name=result["model_name"],
                horizon_minutes=result["horizon_minutes"],
                mae=result["mae"],
                rmse=result["rmse"],
                r2_score=result["r2_score"],
                training_samples=result["training_samples"],
                is_best=result["model_name"] == best_model_name,
                artifact_path=result["artifact_path"],
                trained_at=result["trained_at"],
            )
            self.db.add(metric)
        self.db.commit()

    def generate_forecasts(self) -> list[RadiationForecast]:
        df = self.repository.get_dataframe(limit=500)
        if df.empty:
            logger.warning("No data available for forecast generation")
            return []

        forecast_data = self.predictor.generate_all_forecasts(df, settings.forecast_horizons)
        saved: list[RadiationForecast] = []

        for item in forecast_data:
            forecast = RadiationForecast(**item)
            self.db.add(forecast)
            saved.append(forecast)

        self.db.commit()
        for f in saved:
            self.db.refresh(f)

        logger.info("Generated %d radiation forecasts", len(saved))
        return saved

    def get_latest_forecasts(self) -> list[RadiationForecast]:
        latest_gen = self.db.execute(
            select(RadiationForecast.generated_at)
            .order_by(RadiationForecast.generated_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        if not latest_gen:
            return []

        stmt = (
            select(RadiationForecast)
            .where(RadiationForecast.generated_at == latest_gen)
            .order_by(RadiationForecast.horizon_minutes.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_forecast_history(self, limit: int = 50) -> list[RadiationForecast]:
        stmt = (
            select(RadiationForecast)
            .order_by(RadiationForecast.generated_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
