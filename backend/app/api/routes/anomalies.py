from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import AnomalyResponse
from app.services.anomaly_detection import AnomalyDetectionService

router = APIRouter()


@router.get("/", response_model=list[AnomalyResponse])
def get_anomalies(
    limit: int = Query(default=50, ge=1, le=500),
    unresolved_only: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[AnomalyResponse]:
    service = AnomalyDetectionService(db)
    anomalies = service.get_recent_anomalies(limit=limit, unresolved_only=unresolved_only)
    return [AnomalyResponse.model_validate(a) for a in anomalies]


@router.post("/detect", response_model=list[AnomalyResponse])
def trigger_anomaly_detection(db: Session = Depends(get_db)) -> list[AnomalyResponse]:
    service = AnomalyDetectionService(db)
    reports = service.detect_anomalies()
    return [AnomalyResponse.model_validate(r) for r in reports]
