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
    AICleanupApplyRequest,
    AICleanupApplyResponse,
    AICleanupApplyData,
    AICleanupProposeResponse,
    AICleanupProposeData,
    AIDashboardResponse,
    AIDashboardData,
    AIKeyConfigData,
    AIKeyConfigResponse,
    AIKeyConfigSetRequest,
    AIQueryRequest,
    AIQueryResponse,
    AIQueryData,
    AIReportResponse,
    AIReportData,
    AIUsageResponse,
    AIUsageData,
)
from app.services.ai_key_config_service import AIKeyConfigError, AIKeyConfigService
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


@router.post("/dashboard", response_model=AIDashboardResponse)
def generate_dashboard(
    payload: AIAnomaliesRequest,  # reuses {dataset_id} shape
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIService(db).generate_dashboard(payload.dataset_id, user.id)
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AIDashboardResponse(data=AIDashboardData(**result))


@router.post("/report", response_model=AIReportResponse)
def generate_report(
    payload: AIAnomaliesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = AIService(db).generate_report(payload.dataset_id, user.id)
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AIReportResponse(data=AIReportData(**result))


@router.post("/cleanup", response_model=AICleanupProposeResponse)
def propose_cleanup(
    payload: AIAnomaliesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Advisory only -- never writes to dataset_rows. See POST /ai/cleanup/apply."""
    try:
        result = AIService(db).propose_cleanup(payload.dataset_id, user.id)
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AICleanupProposeResponse(data=AICleanupProposeData(**result))


@router.post("/cleanup/apply", response_model=AICleanupApplyResponse)
def apply_cleanup(
    payload: AICleanupApplyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The ONLY way changes from /ai/cleanup are ever written. Client sends
    back exactly which proposed changes it confirms (its own review step);
    this endpoint never re-invokes the AI and never applies anything not
    explicitly listed here.
    """
    try:
        result = AIService(db).apply_cleanup(
            payload.dataset_id, user.id, [c.model_dump() for c in payload.changes]
        )
    except AIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AICleanupApplyResponse(data=AICleanupApplyData(**result))


@router.get("/usage", response_model=AIUsageResponse)
def get_ai_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = AIService(db).get_usage(user.id)
    return AIUsageResponse(data=AIUsageData(**result))


@router.get("/key-config", response_model=AIKeyConfigResponse)
def get_ai_key_config(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = AIKeyConfigService(db).get_config(user.id)
    return AIKeyConfigResponse(data=AIKeyConfigData(**result))


@router.put("/key-config", response_model=AIKeyConfigResponse)
def set_ai_key_config(
    payload: AIKeyConfigSetRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Switches between platform-managed and BYOK mode. Providing api_key is
    only required when (a) switching to byok mode for the first time, or
    (b) replacing an already-stored key -- re-confirming mode='byok' with
    no api_key reuses whatever key is already stored.
    """
    try:
        result = AIKeyConfigService(db).set_config(user.id, payload.mode, payload.api_key)
    except AIKeyConfigError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return AIKeyConfigResponse(data=AIKeyConfigData(**result))


@router.delete("/key-config", status_code=204)
def delete_ai_key_config(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Clears any stored BYOK key and reverts to platform mode."""
    AIKeyConfigService(db).clear_config(user.id)
    return None
