from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import RiskAssessment, RiskLevel
from app.services.data_collector import SpaceWeatherRepository
from app.services.forecasting import ForecastingService
from app.utilities.config import settings
from app.utilities.logging import get_logger

logger = get_logger(__name__)


class RiskAssessmentService:
    """Calculates satellite radiation risk scores for geostationary operations."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SpaceWeatherRepository(db)
        self.forecasting = ForecastingService(db)

    def assess_current_risk(self) -> RiskAssessment | None:
        latest = self.repository.get_latest()
        if not latest:
            return None

        forecasts = self.forecasting.get_latest_forecasts()
        max_forecast = max((f.predicted_radiation for f in forecasts), default=latest.radiation_level)

        electron_contrib = min(latest.electron_flux / 2000.0, 1.0) * 30
        proton_contrib = min(latest.proton_flux / 10.0, 1.0) * 25
        geomagnetic_contrib = self._geomagnetic_score(latest.kp_index, latest.dst_index)
        forecast_contrib = min(max_forecast / 100.0, 1.0) * 20

        risk_score = round(
            electron_contrib + proton_contrib + geomagnetic_contrib + forecast_contrib, 2
        )
        risk_level = self._classify_risk(risk_score)
        recommendation = self._generate_recommendation(risk_level, latest, max_forecast)

        assessment = RiskAssessment(
            timestamp=latest.timestamp,
            risk_score=risk_score,
            risk_level=risk_level.value,
            electron_contribution=round(electron_contrib, 2),
            proton_contribution=round(proton_contrib, 2),
            geomagnetic_contribution=round(geomagnetic_contrib, 2),
            forecast_contribution=round(forecast_contrib, 2),
            recommendation=recommendation,
        )
        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(assessment)
        logger.info("Risk assessment: score=%.1f level=%s", risk_score, risk_level.value)
        return assessment

    def _geomagnetic_score(self, kp: float | None, dst: float | None) -> float:
        kp_score = ((kp or 0.0) / 9.0) * 12
        dst_score = min(abs(dst or 0.0) / 100.0, 1.0) * 13
        return kp_score + dst_score

    def _classify_risk(self, score: float) -> RiskLevel:
        if score < settings.risk_low_threshold:
            return RiskLevel.LOW
        if score < settings.risk_medium_threshold:
            return RiskLevel.MEDIUM
        return RiskLevel.HIGH

    def _generate_recommendation(
        self, risk_level: RiskLevel, observation, max_forecast: float
    ) -> str:
        if risk_level == RiskLevel.LOW:
            return (
                "Radiation levels nominal. Continue standard GEO satellite operations. "
                "No protective action required."
            )
        if risk_level == RiskLevel.MEDIUM:
            return (
                f"Elevated radiation detected (current: {observation.radiation_level:.1f}, "
                f"peak forecast: {max_forecast:.1f}). "
                "Consider deferring non-critical payload operations and enabling "
                "radiation monitoring on sensitive subsystems."
            )
        return (
            f"HIGH radiation risk (current: {observation.radiation_level:.1f}, "
            f"peak forecast: {max_forecast:.1f}). "
            "Activate safe-mode protocols: power down non-essential systems, "
            "reorient solar panels, and notify mission control immediately."
        )

    def get_latest_assessment(self) -> RiskAssessment | None:
        stmt = (
            select(RiskAssessment)
            .order_by(RiskAssessment.timestamp.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_assessment_history(self, limit: int = 50) -> list[RiskAssessment]:
        stmt = (
            select(RiskAssessment)
            .order_by(RiskAssessment.timestamp.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
