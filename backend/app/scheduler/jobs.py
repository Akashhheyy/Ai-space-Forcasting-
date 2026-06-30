from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database.session import SessionLocal
from app.services.anomaly_detection import AnomalyDetectionService
from app.services.data_collector import DataCollectionService
from app.services.forecasting import ForecastingService
from app.services.risk_assessment import RiskAssessmentService
from app.utilities.app_state import app_state
from app.utilities.config import settings
from app.utilities.exceptions import InsufficientDataError
from app.utilities.logging import get_logger

logger = get_logger(__name__)


class SchedulerManager:
    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler(timezone="UTC")

    def start(self) -> None:
        self.scheduler.add_job(
            self._fetch_data_job,
            trigger=IntervalTrigger(minutes=settings.data_fetch_interval_minutes),
            id="fetch_noaa_data",
            name="Fetch NOAA Space Weather Data",
            replace_existing=True,
            max_instances=1,
        )
        self.scheduler.add_job(
            self._prediction_job,
            trigger=IntervalTrigger(minutes=settings.prediction_interval_minutes),
            id="generate_predictions",
            name="Generate Radiation Predictions",
            replace_existing=True,
            max_instances=1,
        )
        self.scheduler.add_job(
            self._retrain_job,
            trigger=IntervalTrigger(hours=settings.model_retrain_interval_hours),
            id="retrain_models",
            name="Retrain ML Models",
            replace_existing=True,
            max_instances=1,
        )
        self.scheduler.start()
        logger.info("Background scheduler started")

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("Background scheduler stopped")

    async def run_initial_pipeline(self) -> None:
        logger.info("Running initial data collection and ML pipeline...")
        await self._fetch_data_job()
        await self._prediction_job()
        try:
            await self._retrain_job()
        except InsufficientDataError:
            logger.warning("Skipping initial model training — insufficient historical data")

    async def _fetch_data_job(self) -> None:
        db = SessionLocal()
        try:
            service = DataCollectionService(db)
            count = await service.fetch_and_store()
            app_state["last_data_fetch"] = service.last_fetch
            logger.info("Data fetch job complete: %d records", count)
        except Exception as exc:
            logger.error("Data fetch job failed: %s", exc)
        finally:
            db.close()

    async def _prediction_job(self) -> None:
        db = SessionLocal()
        try:
            forecast_service = ForecastingService(db)
            forecasts = forecast_service.generate_forecasts()

            risk_service = RiskAssessmentService(db)
            risk_service.assess_current_risk()

            anomaly_service = AnomalyDetectionService(db)
            anomaly_service.detect_anomalies()

            logger.info(
                "Prediction job complete: %d forecasts generated", len(forecasts)
            )
        except Exception as exc:
            logger.error("Prediction job failed: %s", exc)
        finally:
            db.close()

    async def _retrain_job(self) -> None:
        db = SessionLocal()
        try:
            service = ForecastingService(db)
            results = service.train_models()
            logger.info("Model retrain job complete: %d model variants trained", len(results))
        except InsufficientDataError as exc:
            logger.warning("Model retrain skipped: %s", exc)
        except Exception as exc:
            logger.error("Model retrain job failed: %s", exc)
        finally:
            db.close()


scheduler_manager = SchedulerManager()
