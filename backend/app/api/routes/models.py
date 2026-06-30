from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.db_models import ModelMetric
from app.models.schemas import (
    MessageResponse,
    ModelMetricResponse,
    ModelPerformanceResponse,
    TrainModelRequest,
    TrainModelResponse,
)
from app.services.forecasting import ForecastingService
from app.utilities.exceptions import InsufficientDataError

router = APIRouter()


@router.get("/performance", response_model=ModelPerformanceResponse)
def get_model_performance(db: Session = Depends(get_db)) -> ModelPerformanceResponse:
    stmt = select(ModelMetric).order_by(
        ModelMetric.horizon_minutes.asc(), ModelMetric.rmse.asc()
    )
    all_metrics = list(db.execute(stmt).scalars().all())

    best_stmt = select(ModelMetric).where(ModelMetric.is_best.is_(True)).order_by(
        ModelMetric.horizon_minutes.asc()
    )
    best_models = list(db.execute(best_stmt).scalars().all())

    return ModelPerformanceResponse(
        best_models=[ModelMetricResponse.model_validate(m) for m in best_models],
        all_metrics=[ModelMetricResponse.model_validate(m) for m in all_metrics],
    )


@router.post("/train", response_model=TrainModelResponse)
def train_models(
    request: TrainModelRequest = TrainModelRequest(),
    db: Session = Depends(get_db),
) -> TrainModelResponse:
    service = ForecastingService(db)
    try:
        results = service.train_models(force=request.force_retrain)
    except InsufficientDataError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=422, detail=str(exc)) from exc

    best_models = []
    for horizon in {r["horizon_minutes"] for r in results}:
        horizon_results = [r for r in results if r["horizon_minutes"] == horizon]
        best = min(horizon_results, key=lambda r: r["rmse"])
        best_models.append(f"{best['model_name']}_h{horizon}")

    return TrainModelResponse(
        message="Model training completed successfully",
        models_trained=len(results),
        best_models=best_models,
    )


@router.get("/metrics", response_model=list[ModelMetricResponse])
def get_all_metrics(db: Session = Depends(get_db)) -> list[ModelMetricResponse]:
    stmt = select(ModelMetric).order_by(ModelMetric.trained_at.desc())
    metrics = list(db.execute(stmt).scalars().all())
    return [ModelMetricResponse.model_validate(m) for m in metrics]
