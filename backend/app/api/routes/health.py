from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.utilities.app_state import app_state
from app.models.schemas import HealthResponse
from app.utilities.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    db_status = "connected"
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version=settings.app_version,
        database=db_status,
        scheduler="running" if app_state.get("scheduler_running") else "stopped",
        last_data_fetch=app_state.get("last_data_fetch"),
    )
