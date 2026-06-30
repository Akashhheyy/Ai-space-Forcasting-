from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import (
    CurrentConditionsResponse,
    SpaceWeatherListResponse,
    SpaceWeatherResponse,
)
from app.services.data_collector import SpaceWeatherRepository
from app.services.risk_assessment import RiskAssessmentService

router = APIRouter()


@router.get("/historical", response_model=SpaceWeatherListResponse)
def get_historical_data(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> SpaceWeatherListResponse:
    repo = SpaceWeatherRepository(db)
    items, total = repo.get_history(limit=limit, offset=offset)
    return SpaceWeatherListResponse(
        total=total,
        items=[SpaceWeatherResponse.model_validate(i) for i in items],
    )


@router.get("/current", response_model=CurrentConditionsResponse)
def get_current_conditions(db: Session = Depends(get_db)) -> CurrentConditionsResponse:
    repo = SpaceWeatherRepository(db)
    latest = repo.get_latest()
    if not latest:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="No space weather data available yet")

    risk_service = RiskAssessmentService(db)
    assessment = risk_service.get_latest_assessment()

    return CurrentConditionsResponse(
        timestamp=latest.timestamp,
        electron_flux=latest.electron_flux,
        proton_flux=latest.proton_flux,
        solar_wind_speed=latest.solar_wind_speed,
        kp_index=latest.kp_index,
        dst_index=latest.dst_index,
        radiation_level=latest.radiation_level,
        risk_score=assessment.risk_score if assessment else None,
        risk_level=assessment.risk_level if assessment else None,
    )
