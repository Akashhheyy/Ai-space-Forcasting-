import numpy as np
import pandas as pd

from app.utilities.logging import get_logger

logger = get_logger(__name__)

BASE_COLUMNS = [
    "electron_flux",
    "proton_flux",
    "solar_wind_speed",
    "kp_index",
    "dst_index",
    "radiation_level",
]

LAG_PERIODS = [1, 3, 6, 12, 24]
ROLLING_WINDOWS = [6, 12, 24, 72]

FEATURE_COLUMNS: list[str] = []


def _init_feature_columns() -> list[str]:
    cols = list(BASE_COLUMNS)
    for col in BASE_COLUMNS:
        for lag in LAG_PERIODS:
            cols.append(f"{col}_lag_{lag}")
        for window in ROLLING_WINDOWS:
            cols.append(f"{col}_ma_{window}")
            cols.append(f"{col}_std_{window}")
        cols.append(f"{col}_roc_1")
        cols.append(f"{col}_roc_6")
    return cols


FEATURE_COLUMNS = _init_feature_columns()
TARGET_COLUMN = "radiation_level"


def compute_radiation_level(
    electron_flux: float, proton_flux: float, kp_index: float | None, dst_index: float | None
) -> float:
    """Composite radiation index normalized to 0-100 scale."""
    electron_norm = min(electron_flux / 2000.0, 1.0) * 40
    proton_norm = min(proton_flux / 10.0, 1.0) * 35
    kp_norm = (kp_index or 0.0) / 9.0 * 15
    dst_norm = min(abs(dst_index or 0.0) / 100.0, 1.0) * 10
    return round(electron_norm + proton_norm + kp_norm + dst_norm, 4)


def build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Create lag features, moving averages, rolling stats, and rate-of-change."""
    featured = df.copy()
    featured = featured.sort_values("timestamp").reset_index(drop=True)

    for col in BASE_COLUMNS:
        if col not in featured.columns:
            featured[col] = 0.0
        featured[col] = featured[col].ffill().bfill().fillna(0.0)

        for lag in LAG_PERIODS:
            featured[f"{col}_lag_{lag}"] = featured[col].shift(lag)

        for window in ROLLING_WINDOWS:
            featured[f"{col}_ma_{window}"] = featured[col].rolling(window=window, min_periods=1).mean()
            featured[f"{col}_std_{window}"] = featured[col].rolling(window=window, min_periods=1).std()

        featured[f"{col}_roc_1"] = featured[col].pct_change(periods=1).replace([np.inf, -np.inf], 0)
        featured[f"{col}_roc_6"] = featured[col].pct_change(periods=6).replace([np.inf, -np.inf], 0)

    featured[FEATURE_COLUMNS] = featured[FEATURE_COLUMNS].fillna(0.0)
    return featured


def create_forecast_targets(df: pd.DataFrame, horizon_minutes: int) -> pd.DataFrame:
    """Shift radiation_level forward to create prediction targets."""
    steps = max(1, horizon_minutes // 5)
    result = df.copy()
    result[f"target_{horizon_minutes}m"] = result[TARGET_COLUMN].shift(-steps)
    result = result.dropna(subset=[f"target_{horizon_minutes}m"])
    return result


def steps_for_horizon(horizon_minutes: int) -> int:
    return max(1, horizon_minutes // 5)
