from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SpaceWeatherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    electron_flux: float
    proton_flux: float
    solar_wind_speed: float | None
    kp_index: float | None
    dst_index: float | None
    radiation_level: float
    created_at: datetime


class SpaceWeatherListResponse(BaseModel):
    total: int
    items: list[SpaceWeatherResponse]


class CurrentConditionsResponse(BaseModel):
    timestamp: datetime
    electron_flux: float
    proton_flux: float
    solar_wind_speed: float | None
    kp_index: float | None
    dst_index: float | None
    radiation_level: float
    risk_score: float | None = None
    risk_level: RiskLevelEnum | None = None


class ForecastResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    generated_at: datetime
    forecast_for: datetime
    horizon_minutes: int
    predicted_radiation: float
    model_name: str
    confidence_score: float | None


class ForecastListResponse(BaseModel):
    generated_at: datetime
    forecasts: list[ForecastResponse]


class RiskAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    risk_score: float
    risk_level: RiskLevelEnum
    electron_contribution: float
    proton_contribution: float
    geomagnetic_contribution: float
    forecast_contribution: float
    recommendation: str
    created_at: datetime


class AnomalyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    metric: str
    observed_value: float
    expected_value: float
    z_score: float
    severity: str
    description: str
    is_resolved: bool
    created_at: datetime


class ModelMetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    model_name: str
    horizon_minutes: int
    mae: float
    rmse: float
    r2_score: float
    training_samples: int
    is_best: bool
    artifact_path: str
    trained_at: datetime


class ModelPerformanceResponse(BaseModel):
    best_models: list[ModelMetricResponse]
    all_metrics: list[ModelMetricResponse]


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    scheduler: str
    last_data_fetch: datetime | None = None


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None


class TrainModelRequest(BaseModel):
    force_retrain: bool = Field(default=False, description="Force model retraining")


class TrainModelResponse(BaseModel):
    message: str
    models_trained: int
    best_models: list[str]
