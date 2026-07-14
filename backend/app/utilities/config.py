from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    app_name: str = "Space Radiation Forecast API"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "sqlite:///./data/space_weather.db"

    data_fetch_interval_minutes: int = 5
    prediction_interval_minutes: int = 5
    model_retrain_interval_hours: int = 24

    model_artifacts_dir: str = "artifacts/models"
    min_training_samples: int = 200
    forecast_horizons_minutes: str = "30,360,720"

    noaa_electron_flux_url: str = (
        "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-1-day.json"
    )
    noaa_proton_flux_url: str = (
        "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
    )
    noaa_solar_wind_url: str = (
        "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json"
    )
    noaa_kp_index_url: str = (
        "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    )
    noaa_dst_index_url: str = "https://services.swpc.noaa.gov/products/kyoto-dst.json"

    risk_low_threshold: float = 35.0
    risk_medium_threshold: float = 65.0
    anomaly_zscore_threshold: float = 3.0

    @property
    def forecast_horizons(self) -> list[int]:
        return [int(h.strip()) for h in self.forecast_horizons_minutes.split(",") if h.strip()]

    @property
    def model_artifacts_path(self) -> Path:
        path = Path(self.model_artifacts_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
