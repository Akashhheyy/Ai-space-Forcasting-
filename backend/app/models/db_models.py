from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SpaceWeatherObservation(Base):
    __tablename__ = "space_weather_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, unique=True)
    electron_flux: Mapped[float] = mapped_column(Float, nullable=False)
    proton_flux: Mapped[float] = mapped_column(Float, nullable=False)
    solar_wind_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    kp_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    dst_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    radiation_level: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_space_weather_timestamp", "timestamp"),)


class RadiationForecast(Base):
    __tablename__ = "radiation_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    forecast_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    horizon_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_radiation: Mapped[float] = mapped_column(Float, nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_forecast_generated_at", "generated_at"),
        Index("ix_forecast_horizon", "horizon_minutes"),
    )


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    electron_contribution: Mapped[float] = mapped_column(Float, nullable=False)
    proton_contribution: Mapped[float] = mapped_column(Float, nullable=False)
    geomagnetic_contribution: Mapped[float] = mapped_column(Float, nullable=False)
    forecast_contribution: Mapped[float] = mapped_column(Float, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_risk_timestamp", "timestamp"),)


class AnomalyReport(Base):
    __tablename__ = "anomaly_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    observed_value: Mapped[float] = mapped_column(Float, nullable=False)
    expected_value: Mapped[float] = mapped_column(Float, nullable=False)
    z_score: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_anomaly_timestamp", "timestamp"),)


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    horizon_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    mae: Mapped[float] = mapped_column(Float, nullable=False)
    rmse: Mapped[float] = mapped_column(Float, nullable=False)
    r2_score: Mapped[float] = mapped_column(Float, nullable=False)
    training_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    is_best: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    artifact_path: Mapped[str] = mapped_column(String(512), nullable=False)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_model_metrics_horizon", "horizon_minutes"),
        Index("ix_model_metrics_best", "is_best"),
    )
