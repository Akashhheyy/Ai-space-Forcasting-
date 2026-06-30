from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import ForecastListResponse, ForecastResponse
from app.services.forecasting import ForecastingService

router = APIRouter()


@router.get("/latest", response_model=ForecastListResponse)
def get_latest_forecasts(db: Session = Depends(get_db)) -> ForecastListResponse:
    service = ForecastingService(db)
    forecasts = service.get_latest_forecasts()
    if not forecasts:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="No forecasts available yet")

    return ForecastListResponse(
        generated_at=forecasts[0].generated_at,
        forecasts=[ForecastResponse.model_validate(f) for f in forecasts],
    )


@router.get("/history", response_model=list[ForecastResponse])
def get_forecast_history(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[ForecastResponse]:
    service = ForecastingService(db)
    forecasts = service.get_forecast_history(limit=limit)
    return [ForecastResponse.model_validate(f) for f in forecasts]
