"""
Auth request/response schemas.

Per the Project Structure doc's reasoning: these describe the shape of
data over the API, which is deliberately NOT the same as the database
model shape (e.g. UserOut never includes password_hash, even though
the User model has that column).
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    # max_length=72 matches bcrypt's hard byte limit (see app/core/security.py).
    # Capping it here means an oversized password gets a clean 422 at the
    # API boundary instead of a confusing error deeper in the service layer.
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str  # the credential returned by Google Sign-In on the frontend


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True  # lets this be built directly from a User ORM object


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds, for the access token


class SignupResponse(BaseModel):
    data: UserOut


class LoginResponse(BaseModel):
    data: TokenResponse
