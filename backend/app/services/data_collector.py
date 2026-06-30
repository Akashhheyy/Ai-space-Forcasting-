from datetime import datetime, timezone

import httpx
import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.machine_learning.feature_engineering import compute_radiation_level
from app.models.db_models import SpaceWeatherObservation
from app.utilities.config import settings
from app.utilities.exceptions import DataCollectionError
from app.utilities.logging import get_logger

logger = get_logger(__name__)


class NOAADataCollector:
    """Fetches real-time space weather data from NOAA SWPC APIs."""

    def __init__(self) -> None:
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def _fetch_json(self, url: str) -> list | dict:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def fetch_electron_flux(self) -> pd.DataFrame:
        data = await self._fetch_json(settings.noaa_electron_flux_url)
        df = pd.DataFrame(data)
        df = df[df["energy"] == ">=2 MeV"].copy()
        df["timestamp"] = pd.to_datetime(df["time_tag"], utc=True)
        df = df.rename(columns={"flux": "electron_flux"})
        return df[["timestamp", "electron_flux"]]

    async def fetch_proton_flux(self) -> pd.DataFrame:
        data = await self._fetch_json(settings.noaa_proton_flux_url)
        df = pd.DataFrame(data)
        df = df[df["energy"] == ">=10 MeV"].copy()
        df["timestamp"] = pd.to_datetime(df["time_tag"], utc=True)
        df = df.rename(columns={"flux": "proton_flux"})
        return df[["timestamp", "proton_flux"]]

    async def fetch_solar_wind(self) -> pd.DataFrame:
        data = await self._fetch_json(settings.noaa_solar_wind_url)
        if isinstance(data, list) and len(data) > 1:
            df = pd.DataFrame(data[1:], columns=data[0])
        else:
            df = pd.DataFrame(data)
        df["timestamp"] = pd.to_datetime(df["time_tag"], utc=True)
        df["solar_wind_speed"] = pd.to_numeric(df.get("speed", df.get("Speed")), errors="coerce")
        return df[["timestamp", "solar_wind_speed"]].dropna(subset=["solar_wind_speed"])

    async def fetch_kp_index(self) -> pd.DataFrame:
        data = await self._fetch_json(settings.noaa_kp_index_url)
        df = pd.DataFrame(data)
        df["timestamp"] = pd.to_datetime(df["time_tag"], utc=True)
        df = df.rename(columns={"Kp": "kp_index"})
        return df[["timestamp", "kp_index"]]

    async def fetch_dst_index(self) -> pd.DataFrame:
        data = await self._fetch_json(settings.noaa_dst_index_url)
        df = pd.DataFrame(data)
        df["timestamp"] = pd.to_datetime(df["time_tag"], utc=True)
        df = df.rename(columns={"dst": "dst_index"})
        return df[["timestamp", "dst_index"]]

    async def collect_merged_data(self) -> pd.DataFrame:
        try:
            electron_df = await self.fetch_electron_flux()
            proton_df = await self.fetch_proton_flux()

            merged = pd.merge(electron_df, proton_df, on="timestamp", how="outer")

            for fetcher, col in [
                (self.fetch_solar_wind, "solar_wind_speed"),
                (self.fetch_kp_index, "kp_index"),
                (self.fetch_dst_index, "dst_index"),
            ]:
                try:
                    aux_df = await fetcher()
                    merged = pd.merge(merged, aux_df, on="timestamp", how="outer")
                except Exception as exc:
                    logger.warning("Failed to fetch %s: %s", col, exc)
                    merged[col] = None

            merged = merged.sort_values("timestamp").reset_index(drop=True)
            merged = self._forward_fill_auxiliary(merged)
            merged["radiation_level"] = merged.apply(
                lambda row: compute_radiation_level(
                    row["electron_flux"],
                    row["proton_flux"],
                    row.get("kp_index"),
                    row.get("dst_index"),
                ),
                axis=1,
            )
            return merged.dropna(subset=["electron_flux", "proton_flux"])
        except httpx.HTTPError as exc:
            raise DataCollectionError(f"NOAA API request failed: {exc}") from exc

    def _forward_fill_auxiliary(self, df: pd.DataFrame) -> pd.DataFrame:
        for col in ["solar_wind_speed", "kp_index", "dst_index"]:
            if col in df.columns:
                df[col] = df[col].ffill().bfill()
        return df


class SpaceWeatherRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert_observations(self, df: pd.DataFrame) -> int:
        records = []
        for _, row in df.iterrows():
            records.append(
                {
                    "timestamp": row["timestamp"].to_pydatetime()
                    if hasattr(row["timestamp"], "to_pydatetime")
                    else row["timestamp"],
                    "electron_flux": float(row["electron_flux"]),
                    "proton_flux": float(row["proton_flux"]),
                    "solar_wind_speed": float(row["solar_wind_speed"])
                    if pd.notna(row.get("solar_wind_speed"))
                    else None,
                    "kp_index": float(row["kp_index"]) if pd.notna(row.get("kp_index")) else None,
                    "dst_index": float(row["dst_index"])
                    if pd.notna(row.get("dst_index"))
                    else None,
                    "radiation_level": float(row["radiation_level"]),
                }
            )

        if not records:
            return 0

        stmt = insert(SpaceWeatherObservation).values(records)
        stmt = stmt.on_conflict_do_update(
            index_elements=["timestamp"],
            set_={
                "electron_flux": stmt.excluded.electron_flux,
                "proton_flux": stmt.excluded.proton_flux,
                "solar_wind_speed": stmt.excluded.solar_wind_speed,
                "kp_index": stmt.excluded.kp_index,
                "dst_index": stmt.excluded.dst_index,
                "radiation_level": stmt.excluded.radiation_level,
            },
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or len(records)

    def get_latest(self) -> SpaceWeatherObservation | None:
        stmt = (
            select(SpaceWeatherObservation)
            .order_by(SpaceWeatherObservation.timestamp.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_history(
        self, limit: int = 100, offset: int = 0
    ) -> tuple[list[SpaceWeatherObservation], int]:
        count_stmt = select(SpaceWeatherObservation)
        total = len(self.db.execute(count_stmt).scalars().all())

        stmt = (
            select(SpaceWeatherObservation)
            .order_by(SpaceWeatherObservation.timestamp.desc())
            .offset(offset)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def get_dataframe(self, limit: int | None = None) -> pd.DataFrame:
        stmt = select(SpaceWeatherObservation).order_by(SpaceWeatherObservation.timestamp.asc())
        if limit:
            stmt = stmt.limit(limit)
        rows = self.db.execute(stmt).scalars().all()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(
            [
                {
                    "timestamp": r.timestamp,
                    "electron_flux": r.electron_flux,
                    "proton_flux": r.proton_flux,
                    "solar_wind_speed": r.solar_wind_speed,
                    "kp_index": r.kp_index,
                    "dst_index": r.dst_index,
                    "radiation_level": r.radiation_level,
                }
                for r in rows
            ]
        )


class DataCollectionService:
    def __init__(self, db: Session) -> None:
        self.collector = NOAADataCollector()
        self.repository = SpaceWeatherRepository(db)
        self.last_fetch: datetime | None = None

    async def fetch_and_store(self) -> int:
        logger.info("Fetching NOAA space weather data...")
        raw_df = await self.collector.collect_merged_data()
        cleaned_df = self._clean_data(raw_df)
        count = self.repository.upsert_observations(cleaned_df)
        self.last_fetch = datetime.now(timezone.utc)
        logger.info("Stored %d space weather observations", count)
        return count

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.drop_duplicates(subset=["timestamp"])
        df = df.sort_values("timestamp")

        for col in ["electron_flux", "proton_flux", "solar_wind_speed", "kp_index", "dst_index"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df = df.dropna(subset=["electron_flux", "proton_flux"])
        df = df[df["electron_flux"] >= 0]
        df = df[df["proton_flux"] >= 0]

        for col in ["electron_flux", "proton_flux"]:
            q1, q3 = df[col].quantile(0.01), df[col].quantile(0.99)
            df[col] = df[col].clip(lower=q1, upper=q3)

        return df
