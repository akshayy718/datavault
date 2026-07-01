"""
Auth routes. Thin by design -- every route just validates input shape
(via the Pydantic schema), calls into AuthService, and translates the
result (or AuthError) into an HTTP response. No business logic lives here.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    UserOut,
)
from app.services.auth_service import AuthError, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(access_token: str, refresh_token: str, expires_in: int) -> LoginResponse:
    return LoginResponse(
        data=TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)
    )


@router.post("/signup", response_model=SignupResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        user = service.signup(payload.email, payload.password, payload.name)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return SignupResponse(data=UserOut.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        access, refresh, expires_in = service.login(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _token_response(access, refresh, expires_in)


@router.post("/google", response_model=LoginResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        access, refresh, expires_in = service.google_login(payload.id_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _token_response(access, refresh, expires_in)


@router.post("/refresh", response_model=LoginResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        access, refresh_token, expires_in = service.refresh(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _token_response(access, refresh_token, expires_in)


@router.post("/logout", status_code=204)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    service.logout(payload.refresh_token)
    return None


@router.get("/me", response_model=SignupResponse)
def me(user: User = Depends(get_current_user)):
    """
    A minimal protected route -- exists in this module specifically to
    prove get_current_user works end-to-end (valid token -> real user
    returned; missing/invalid token -> 401). Every future protected route
    in later modules depends on the same get_current_user already proven
    here.
    """
    return SignupResponse(data=UserOut.model_validate(user))
