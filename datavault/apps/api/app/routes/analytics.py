"""
Analytics routes. Per the API Design doc's endpoint table, these live
under both /shares/{id}/analytics and /workspaces/{id}/analytics --
mounted here as their own router for clarity, since neither cleanly
belongs to shares.py or a not-yet-existing workspaces.py.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.analytics import (
    ShareAnalyticsOut,
    ShareAnalyticsResponse,
    WorkspaceAnalyticsOut,
    WorkspaceAnalyticsResponse,
)
from app.services.analytics_service import AnalyticsError, AnalyticsService
from app.services.auth_service import AuthService

router = APIRouter(tags=["analytics"])


@router.get("/shares/{share_id}/analytics", response_model=ShareAnalyticsResponse)
def get_share_analytics(share_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = AnalyticsService(db).get_share_analytics(share_id, user.id)
    except AnalyticsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return ShareAnalyticsResponse(data=ShareAnalyticsOut(**result))


@router.get("/workspaces/me/analytics", response_model=WorkspaceAnalyticsResponse)
def get_my_workspace_analytics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Convenience endpoint: most owners only have one workspace (per the
    MVP simplification in auth_service.py), so this skips needing to know
    the workspace_id at all -- a small but real usability improvement
    over forcing every dashboard call to look up its own workspace ID first.

    IMPORTANT: this route is registered BEFORE the parameterized
    /workspaces/{workspace_id}/analytics route below. FastAPI matches
    routes in registration order, and "me" would otherwise be captured
    as a literal workspace_id value by the parameterized route -- a
    classic routing-order bug that's easy to introduce by accident and
    easy to miss until you specifically test the literal-path route.
    """
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    try:
        result = AnalyticsService(db).get_workspace_analytics(workspace_id, user.id)
    except AnalyticsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return WorkspaceAnalyticsResponse(data=WorkspaceAnalyticsOut(**result))


@router.get("/workspaces/{workspace_id}/analytics", response_model=WorkspaceAnalyticsResponse)
def get_workspace_analytics(workspace_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = AnalyticsService(db).get_workspace_analytics(workspace_id, user.id)
    except AnalyticsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return WorkspaceAnalyticsResponse(data=WorkspaceAnalyticsOut(**result))
