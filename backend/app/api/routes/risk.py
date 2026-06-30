from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.schemas import RiskAssessmentResponse
from app.services.risk_assessment import RiskAssessmentService

router = APIRouter()


@router.get("/current", response_model=RiskAssessmentResponse)
def get_current_risk(db: Session = Depends(get_db)) -> RiskAssessmentResponse:
    service = RiskAssessmentService(db)
    assessment = service.get_latest_assessment()
    if not assessment:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="No risk assessment available yet")
    return RiskAssessmentResponse.model_validate(assessment)


@router.post("/assess", response_model=RiskAssessmentResponse)
def trigger_risk_assessment(db: Session = Depends(get_db)) -> RiskAssessmentResponse:
    service = RiskAssessmentService(db)
    assessment = service.assess_current_risk()
    if not assessment:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="No space weather data for risk assessment")
    return RiskAssessmentResponse.model_validate(assessment)


@router.get("/history", response_model=list[RiskAssessmentResponse])
def get_risk_history(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[RiskAssessmentResponse]:
    service = RiskAssessmentService(db)
    assessments = service.get_assessment_history(limit=limit)
    return [RiskAssessmentResponse.model_validate(a) for a in assessments]
