"""
AI routes. Thin -- validate, call AIService, translate AIError into HTTP.

Note the response codes: 503 means "AI isn't configured or unreachable,"
422 means "AI responded but its answer didn't validate against the real
dataset" -- these are deliberately distinct so the frontend (and you,
testing this) can tell "you need to set up an API key" apart from
"the AI tried but got it wrong."
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.ai import (
    AIAnomaliesRequest,
    AIAnomaliesResponse,
    AIAnomaliesData,
    AIQueryRequest,
    AIQueryResponse,
    AIQueryData,
    AIUsageResponse,
    AIUsageData,
)
from app.services.ai_service import AIError, AIService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/query", response_model=AIQueryResponse)
def query_natural_language(
    payload: AIQueryRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIService(db).query_natural_language(payload.dataset_id, user.id, payload.query)
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AIQueryResponse(data=AIQueryData(**result))


@router.post("/anomalies", response_model=AIAnomaliesResponse)
def detect_anomalies(
    payload: AIAnomaliesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIService(db).detect_anomalies(payload.dataset_id, user.id)
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AIAnomaliesResponse(data=AIAnomaliesData(**result))


@router.get("/usage", response_model=AIUsageResponse)
def get_ai_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = AIService(db).get_usage(user.id)
    return AIUsageResponse(data=AIUsageData(**result))
