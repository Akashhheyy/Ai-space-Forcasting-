import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import AnomalyReport
from app.services.data_collector import SpaceWeatherRepository
from app.utilities.config import settings
from app.utilities.logging import get_logger

logger = get_logger(__name__)

ANOMALY_METRICS = ["electron_flux", "proton_flux", "radiation_level", "solar_wind_speed"]


class AnomalyDetectionService:
    """Detects abnormal radiation spikes using rolling z-score analysis."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SpaceWeatherRepository(db)

    def detect_anomalies(self, window: int = 24) -> list[AnomalyReport]:
        df = self.repository.get_dataframe(limit=500)
        if len(df) < window + 5:
            logger.warning("Insufficient data for anomaly detection")
            return []

        reports: list[AnomalyReport] = []
        recent = df.tail(window + 1)

        for metric in ANOMALY_METRICS:
            if metric not in recent.columns or recent[metric].isna().all():
                continue

            values = recent[metric].dropna()
            if len(values) < window:
                continue

            rolling_mean = values.rolling(window=window, min_periods=window).mean()
            rolling_std = values.rolling(window=window, min_periods=window).std()

            latest_idx = values.index[-1]
            observed = float(values.iloc[-1])
            expected = float(rolling_mean.iloc[-1]) if not pd.isna(rolling_mean.iloc[-1]) else observed
            std = float(rolling_std.iloc[-1]) if not pd.isna(rolling_std.iloc[-1]) else 1e-6

            z_score = (observed - expected) / (std + 1e-6)

            if abs(z_score) >= settings.anomaly_zscore_threshold:
                severity = self._classify_severity(z_score)
                description = (
                    f"Abnormal {metric} spike detected: observed={observed:.4f}, "
                    f"expected={expected:.4f}, z-score={z_score:.2f}"
                )
                report = AnomalyReport(
                    timestamp=recent.loc[latest_idx, "timestamp"],
                    metric=metric,
                    observed_value=observed,
                    expected_value=expected,
                    z_score=round(z_score, 4),
                    severity=severity,
                    description=description,
                )
                self.db.add(report)
                reports.append(report)

        if reports:
            self.db.commit()
            for r in reports:
                self.db.refresh(r)
            logger.info("Detected %d radiation anomalies", len(reports))

        return reports

    def _classify_severity(self, z_score: float) -> str:
        abs_z = abs(z_score)
        if abs_z >= 5.0:
            return "CRITICAL"
        if abs_z >= 4.0:
            return "SEVERE"
        return "MODERATE"

    def get_recent_anomalies(self, limit: int = 50, unresolved_only: bool = False) -> list[AnomalyReport]:
        stmt = select(AnomalyReport).order_by(AnomalyReport.timestamp.desc())
        if unresolved_only:
            stmt = stmt.where(AnomalyReport.is_resolved.is_(False))
        stmt = stmt.limit(limit)
        return list(self.db.execute(stmt).scalars().all())
