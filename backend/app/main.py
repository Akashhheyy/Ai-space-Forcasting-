from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import anomalies, data, forecasts, health, models, risk
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.scheduler.jobs import scheduler_manager
from app.utilities.app_state import app_state
from app.utilities.config import settings
from app.utilities.exceptions import (
    DataCollectionError,
    InsufficientDataError,
    ModelNotFoundError,
    SpaceRadiationError,
)
from app.utilities.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")

    scheduler_manager.start()
    app_state["scheduler_running"] = True

    await scheduler_manager.run_initial_pipeline()
    app_state["last_data_fetch"] = datetime.now(timezone.utc)

    yield

    scheduler_manager.shutdown()
    app_state["scheduler_running"] = False
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-Based Space Radiation Forecasting System for Geostationary Satellites. "
        "Collects real-time NOAA space weather data, trains ML models, generates "
        "radiation forecasts, assesses satellite risk, and detects anomalies."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(data.router, prefix="/api/v1/data", tags=["Space Weather Data"])
app.include_router(forecasts.router, prefix="/api/v1/forecasts", tags=["Forecasts"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk Assessment"])
app.include_router(anomalies.router, prefix="/api/v1/anomalies", tags=["Anomaly Detection"])
app.include_router(models.router, prefix="/api/v1/models", tags=["Model Performance"])


@app.exception_handler(SpaceRadiationError)
async def space_radiation_exception_handler(request: Request, exc: SpaceRadiationError):
    status_code = 400
    if isinstance(exc, InsufficientDataError):
        status_code = 422
    elif isinstance(exc, ModelNotFoundError):
        status_code = 404
    elif isinstance(exc, DataCollectionError):
        status_code = 502

    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc), "error_type": type(exc).__name__},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": "InternalError"},
    )
