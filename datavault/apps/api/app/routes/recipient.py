"""
Public recipient routes. NO authentication dependency anywhere in this
file -- that's intentional, not an oversight. Per the Architecture doc's
Section 7 (Authentication): "Recipient 'auth' is really just share-level
access control, which is a different and more granular thing." This
router enforces that access control (PIN, expiry, revocation, view
limits) entirely inside ShareService.resolve_for_recipient(), never via
a login.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.shares import RecipientViewData, RecipientViewResponse, UnlockRequest
from app.services.share_service import ShareError, ShareService

router = APIRouter(tags=["recipient"])


def _client_info(request: Request) -> tuple[str, str | None]:
    """
    Minimal device-type sniffing from the User-Agent header, for the
    view_events analytics row. Deliberately not a real device/browser
    parsing library -- that's more precision than the MVP analytics
    dashboard (Phase 3+) actually needs yet.
    """
    user_agent = request.headers.get("user-agent", "")
    device_type = "mobile" if "Mobile" in user_agent else "desktop"
    # Country is left None here -- real IP-to-country lookup needs a geo
    # database/service, an explicitly later-phase addition. Recording
    # `None` honestly reflects "we don't know yet," rather than guessing.
    country = None
    return device_type, country


@router.get("/view/{token}", response_model=RecipientViewResponse)
def view_share(token: str, request: Request, db: Session = Depends(get_db)):
    device_type, country = _client_info(request)
    try:
        result = ShareService(db).resolve_for_recipient(
            token, pin=None, device_type=device_type, country=country
        )
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return RecipientViewResponse(data=RecipientViewData(**result))


@router.post("/view/{token}/unlock", response_model=RecipientViewResponse)
def unlock_share(token: str, payload: UnlockRequest, request: Request, db: Session = Depends(get_db)):
    device_type, country = _client_info(request)
    try:
        result = ShareService(db).resolve_for_recipient(
            token, pin=payload.pin, device_type=device_type, country=country
        )
    except ShareError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return RecipientViewResponse(data=RecipientViewData(**result))
