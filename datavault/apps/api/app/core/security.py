"""
Password hashing and JWT helpers.

This is the one file in the codebase that should know how passwords are
hashed or how tokens are signed -- every other file calls into these
functions rather than reimplementing the logic itself.

Password hashing uses the `bcrypt` library directly rather than going
through `passlib`. passlib's bcrypt backend runs an internal
self-test ("detect_wrap_bug") on import that breaks under bcrypt 4.1+
(it raises ValueError instead of the old silent-truncation behavior
passlib's test expected) -- a real, currently-unresolved compatibility
gap between the two libraries' release cadences. Calling bcrypt directly
avoids that fragile detection layer entirely; the API surface we actually
need (hash + verify) is two functions either way.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal
import uuid

import bcrypt
import jwt

from app.core.config import settings

# bcrypt has a hard 72-BYTE input limit (not 72 characters -- multi-byte
# UTF-8 characters count for more than 1 byte each). We enforce this
# explicitly and raise a clear error rather than letting bcrypt fail with
# a confusing low-level ValueError deep in a request.
_MAX_PASSWORD_BYTES = 72


def hash_password(plain_password: str) -> str:
    encoded = plain_password.encode("utf-8")
    if len(encoded) > _MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {_MAX_PASSWORD_BYTES} bytes.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(encoded, salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash (shouldn't happen with our own data, but a
        # corrupted/garbage hash should fail verification, not crash).
        return False


TokenType = Literal["access", "refresh"]


def create_token(user_id: str, token_type: TokenType) -> str:
    """
    Creates a signed JWT for either an access or refresh token -- the two
    differ only in lifetime and the `type` claim, so one function handles
    both rather than duplicating near-identical code.

    Includes a `jti` (JWT ID) claim: a random unique value per token. This
    matters more than it looks -- without it, two tokens for the same user
    and type, issued within the same second, would be byte-for-byte
    identical (since `sub`, `type`, `iat`, and `exp` would all match
    exactly). That's not just a theoretical edge case: it actually breaks
    the UNIQUE constraint on refresh_tokens.token_hash the moment a
    refresh happens quickly after login. `jti` guarantees every issued
    token is distinct regardless of timing.
    """
    now = datetime.now(timezone.utc)
    if token_type == "access":
        expires_delta = timedelta(minutes=settings.jwt_access_token_expiry_minutes)
    else:
        expires_delta = timedelta(days=settings.jwt_refresh_token_expiry_days)

    payload = {
        "sub": user_id,
        "type": token_type,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Raises jwt.PyJWTError (or a subclass like ExpiredSignatureError) on any
    problem -- invalid signature, expired, malformed. Callers must catch
    this and turn it into a 401, not let it bubble up as a 500.
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
