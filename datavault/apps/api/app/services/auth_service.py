"""
AuthService -- all the business rules for authentication live here, not in
the route handlers. Routes (app/routes/auth.py) just translate HTTP <->
this service, per the layered architecture from the Project Structure doc.
"""
import hashlib
from datetime import datetime, timedelta, timezone

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models.auth import RefreshToken
from app.models.identity import Organization, OrganizationMember, User, Workspace, WorkspaceSettings


class AuthError(Exception):
    """Raised for any auth failure the route layer should turn into a 401/409."""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _hash_token(token: str) -> str:
    # We only ever need to check "does this exact token match a stored
    # hash", never reverse it -- so a fast, deterministic hash (SHA-256) is
    # appropriate here, unlike passwords. Passwords need bcrypt specifically
    # because they must resist offline brute-forcing of a *small, guessable*
    # input space (human-chosen words). A refresh token is already a long,
    # random, high-entropy string -- brute-forcing it is infeasible
    # regardless of hash speed, so SHA-256 is the right, simpler tool here.
    return hashlib.sha256(token.encode()).hexdigest()


def _as_aware_utc(dt: datetime) -> datetime:
    """
    SQLite doesn't actually preserve timezone info on read, even for a
    column declared DateTime(timezone=True) -- it comes back naive. This
    breaks comparisons against datetime.now(timezone.utc), which raises
    TypeError("can't compare offset-naive and offset-aware datetimes").
    PostgreSQL, by contrast, genuinely round-trips timezone-aware values.
    To make the same comparison code correct on both engines, we
    explicitly treat any naive datetime read from the database as UTC
    (which is true -- every datetime this app writes is UTC, per the
    mixins' use of datetime.now(timezone.utc)) before comparing.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _create_default_workspace_for(db: Session, user: User) -> None:
    """
    MVP simplification (per the Project Structure doc, Section 4): every
    personal account auto-creates one default workspace under an implicit
    personal organization, rather than forcing a "create an organization?"
    step before someone can even try the product. This is what every
    later module (Datasets, Shares) assumes exists -- a dataset always
    belongs to a workspace, with no "no workspace yet" state to handle.

    Called once at account creation, for both email/password signup and
    first-time Google login, so neither path leaves a user without
    somewhere to put their data.
    """
    org = Organization(name=f"{user.name}'s Organization", created_by=user.id)
    db.add(org)
    db.flush()

    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="admin"))

    workspace = Workspace(organization_id=org.id, name="My Workspace", created_by=user.id)
    db.add(workspace)
    db.flush()

    db.add(WorkspaceSettings(workspace_id=workspace.id, default_share_mode="snapshot"))


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    # ---- Signup ----

    def signup(self, email: str, password: str, name: str) -> User:
        existing = self.db.query(User).filter(User.email == email).first()
        if existing:
            raise AuthError("An account with this email already exists.", status_code=409)

        user = User(email=email, password_hash=hash_password(password), name=name)
        self.db.add(user)
        self.db.flush()  # assigns user.id without committing yet
        _create_default_workspace_for(self.db, user)
        self.db.commit()
        self.db.refresh(user)
        return user

    # ---- Email/password login ----

    def login(self, email: str, password: str) -> tuple[str, str, int]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            # Deliberately the same error for "no such user" and "wrong
            # password" -- distinguishing them would let an attacker
            # enumerate which emails have accounts.
            raise AuthError("Invalid email or password.")
        return self._issue_tokens(user.id)

    # ---- Google login ----

    def google_login(self, google_id_token_str: str) -> tuple[str, str, int]:
        try:
            claims = google_id_token.verify_oauth2_token(
                google_id_token_str,
                google_requests.Request(),
                settings.google_oauth_client_id,
            )
        except ValueError as exc:
            raise AuthError(f"Invalid Google token: {exc}") from exc

        google_sub = claims["sub"]
        email = claims.get("email")
        name = claims.get("name", email)

        user = self.db.query(User).filter(User.google_id == google_sub).first()
        if not user:
            # No account with this Google ID yet -- check if the email is
            # already registered via password (link accounts) or create new.
            user = self.db.query(User).filter(User.email == email).first()
            if user:
                user.google_id = google_sub
            else:
                user = User(
                    email=email,
                    name=name,
                    google_id=google_sub,
                    # No password set for Google-only accounts. password_hash
                    # is NOT NULL in the schema, so we store an unusable
                    # placeholder rather than relaxing that constraint --
                    # this account can only ever log in via Google unless the
                    # user later sets a password through a "set password" flow.
                    password_hash=hash_password(google_sub + settings.jwt_secret),
                )
                self.db.add(user)
                self.db.flush()
                _create_default_workspace_for(self.db, user)
            self.db.commit()
            self.db.refresh(user)

        return self._issue_tokens(user.id)

    # ---- Refresh ----

    def refresh(self, refresh_token_str: str) -> tuple[str, str, int]:
        try:
            payload = decode_token(refresh_token_str)
        except Exception as exc:
            raise AuthError(f"Invalid refresh token: {exc}") from exc

        if payload.get("type") != "refresh":
            raise AuthError("Token is not a refresh token.")

        token_hash = _hash_token(refresh_token_str)
        stored = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if not stored or stored.revoked_at is not None:
            raise AuthError("Refresh token has been revoked or is unknown.")
        if _as_aware_utc(stored.expires_at) < datetime.now(timezone.utc):
            raise AuthError("Refresh token has expired.")

        # Rotate: revoke the old refresh token and issue a brand new pair.
        # This means a stolen refresh token can only be used once before
        # the legitimate user's next refresh invalidates it -- a stronger
        # guarantee than letting the same refresh token be reused for days.
        stored.revoked_at = datetime.now(timezone.utc)
        self.db.commit()

        return self._issue_tokens(payload["sub"])

    # ---- Logout ----

    def logout(self, refresh_token_str: str) -> None:
        token_hash = _hash_token(refresh_token_str)
        stored = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if stored and stored.revoked_at is None:
            stored.revoked_at = datetime.now(timezone.utc)
            self.db.commit()
        # No error if the token is already gone/revoked -- logout should be
        # safe to call more than once without surprising the client.

    # ---- Workspace lookup (used by Module 3 onward) ----

    def get_default_workspace_id(self, user_id: str) -> str:
        """
        Returns the workspace ID for this user's own organization. MVP
        assumption (documented, not hidden): every user has exactly one
        workspace from signup (see _create_default_workspace_for). Once
        true multi-workspace support lands, this becomes "pick the
        workspace from the request context" instead of "the only one
        they have" -- a clearly bounded place to revisit, not a silent
        assumption buried in every route that needs a workspace.
        """
        membership = (
            self.db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == user_id)
            .first()
        )
        if not membership:
            raise AuthError("User has no organization/workspace.", status_code=500)
        workspace = (
            self.db.query(Workspace)
            .filter(Workspace.organization_id == membership.organization_id)
            .first()
        )
        if not workspace:
            raise AuthError("User's organization has no workspace.", status_code=500)
        return workspace.id

    # ---- Shared token issuance ----

    def _issue_tokens(self, user_id: str) -> tuple[str, str, int]:
        access_token = create_token(user_id, "access")
        refresh_token_str = create_token(user_id, "refresh")

        self.db.add(RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(refresh_token_str),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expiry_days),
        ))
        self.db.commit()

        expires_in = settings.jwt_access_token_expiry_minutes * 60
        return access_token, refresh_token_str, expires_in
