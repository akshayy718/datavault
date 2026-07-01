"""
Owner-side share routes: create, view metadata, revoke, export. The
public recipient route (GET /view/{token}) lives in app/routes/recipient.py
-- deliberately a separate file/router, mounted WITHOUT the /api/v1 prefix
and WITHOUT any auth dependency, since it's a fundamentally different
audience (anonymous recipients, not logged-in owners).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.exports import ExportRequest
from app.schemas.shares import ShareCreateRequest, ShareOut, ShareResponse
from app.services.export_service import ExportError, ExportService
from app.services.share_service import ShareError, ShareService

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post("", response_model=ShareResponse, status_code=201)
def create_share(
    payload: ShareCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        share = ShareService(db).create_share(
            dataset_id=payload.dataset_id,
            owner_id=user.id,
            selection_type=payload.selection_type,
            selection_spec=payload.selection_spec,
            mode=payload.mode,
            format=payload.format,
            template_id=payload.template_id,
            pin=payload.pin,
            expires_at=payload.expires_at,
            max_views=payload.max_views,
        )
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return ShareResponse(data=ShareOut.model_validate(share))


@router.get("/{share_id}", response_model=ShareResponse)
def get_share(share_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        share = ShareService(db).get_share(share_id, user.id)
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return ShareResponse(data=ShareOut.model_validate(share))


@router.post("/{share_id}/revoke", response_model=ShareResponse)
def revoke_share(share_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        share = ShareService(db).revoke_share(share_id, user.id)
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return ShareResponse(data=ShareOut.model_validate(share))


@router.post("/{share_id}/export")
def export_share(
    share_id: str,
    payload: ExportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the actual file bytes directly (not a JSON envelope) with the
    right Content-Type and a Content-Disposition header, so it downloads
    with a sensible filename when hit from a browser or Swagger UI's
    "Download file" link, rather than returning JSON describing a file.
    """
    try:
        content, content_type, filename = ExportService(db).export_share(share_id, user.id, payload.format)
    except ExportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
