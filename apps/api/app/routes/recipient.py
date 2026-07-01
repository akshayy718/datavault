"""
Public recipient routes. NO authentication dependency anywhere in this
file -- intentional. Access control (PIN, expiry, revocation, view
limits) lives entirely in ShareService.resolve_for_recipient().

Module 10 additions (session, recently-viewed, saved cards) are also
fully public/login-free -- device_token is an opaque client-held value,
never tied to a user account.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.shares import RecipientViewData, RecipientViewResponse, UnlockRequest
from app.services.recipient_session_service import RecipientSessionService, SessionError
from app.services.share_service import ShareError, ShareService

router = APIRouter(tags=["recipient"])


def _client_info(request: Request) -> tuple[str, str | None]:
    user_agent = request.headers.get("user-agent", "")
    device_type = "mobile" if "Mobile" in user_agent else "desktop"
    country = None
    return device_type, country


@router.get("/view/{token}", response_model=RecipientViewResponse)
def view_share(
    token: str, request: Request, db: Session = Depends(get_db),
    x_device_token: str | None = Header(default=None),
):
    device_type, country = _client_info(request)
    try:
        result = ShareService(db).resolve_for_recipient(
            token, pin=None, device_type=device_type, country=country, device_token=x_device_token
        )
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return RecipientViewResponse(data=RecipientViewData(**result))


@router.post("/view/{token}/unlock", response_model=RecipientViewResponse)
def unlock_share(
    token: str, payload: UnlockRequest, request: Request, db: Session = Depends(get_db),
    x_device_token: str | None = Header(default=None),
):
    device_type, country = _client_info(request)
    try:
        result = ShareService(db).resolve_for_recipient(
            token, pin=payload.pin, device_type=device_type, country=country, device_token=x_device_token
        )
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return RecipientViewResponse(data=RecipientViewData(**result))


@router.get("/recipient/session")
def get_session(x_device_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Returns a device_token -- pass an existing one to validate it, or
    omit to receive a freshly issued one. Client stores this (e.g.
    localStorage) and sends it as X-Device-Token on subsequent calls."""
    token = RecipientSessionService(db).get_or_create_device_token(x_device_token)
    return {"data": {"device_token": token}}


@router.get("/recipient/recently-viewed")
def recently_viewed(x_device_token: str = Header(...), db: Session = Depends(get_db)):
    results = RecipientSessionService(db).recently_viewed(x_device_token)
    return {"data": results}


@router.post("/recipient/saved-cards/{share_id}")
def save_card(share_id: str, x_device_token: str = Header(...), db: Session = Depends(get_db)):
    try:
        result = RecipientSessionService(db).save_card(x_device_token, share_id)
    except SessionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return {"data": result}


@router.get("/recipient/saved-cards")
def list_saved_cards(x_device_token: str = Header(...), db: Session = Depends(get_db)):
    results = RecipientSessionService(db).list_saved_cards(x_device_token)
    return {"data": results}


@router.delete("/recipient/saved-cards/{share_id}", status_code=204)
def unsave_card(share_id: str, x_device_token: str = Header(...), db: Session = Depends(get_db)):
    RecipientSessionService(db).unsave_card(x_device_token, share_id)
    return None
