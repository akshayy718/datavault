"""
Reusable FastAPI dependencies: who is making this request, and are they
allowed to do what they're asking?

`get_current_user` is what every protected route depends on -- it's the
single place that knows how to read an Authorization header and turn it
into a real User row (or reject the request).

`require_role` is the RBAC building block: a dependency *factory* that
later modules (Datasets, Shares, etc.) will use like
`Depends(require_role("admin", "owner"))` on any route that's restricted
to certain workspace roles. It's built now, with no real callers yet,
because Auth is exactly where this belongs -- it's part of "how does
authorization work," not part of any one feature.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.identity import OrganizationMember, User

# HTTPBearer (not OAuth2PasswordBearer) is the correct scheme here: this
# app issues its own plain JWTs via /auth/login and never implements the
# OAuth2 "password grant" flow (form-encoded username/password POSTed to
# a token endpoint, per the OAuth2 spec). OAuth2PasswordBearer was the
# wrong tool -- it makes Swagger UI render a username/password login form
# in the "Authorize" dialog and submit it as OAuth2 form data, which our
# JSON-based /auth/login route doesn't accept. HTTPBearer instead gives a
# simple "paste your token" box, matching what we actually do.
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token is not an access token.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists.")
    return user


def require_role(*allowed_roles: str):
    """
    Usage in a later module's route:

        @router.delete("/workspaces/{workspace_id}")
        def delete_workspace(
            workspace_id: str,
            user: User = Depends(get_current_user),
            _: None = Depends(require_role("admin")),
        ):
            ...

    This MVP version checks role within the user's memberships generically
    (any organization, since we don't yet have a workspace_id path param
    standardized across routes). Once real workspace-scoped routes exist,
    this should be tightened to check the role specifically for the
    workspace_id/organization_id in that route's own path -- left as a
    clearly-marked extension point rather than guessed at now, since
    getting authorization scoping wrong silently is worse than leaving it
    visibly incomplete.
    """
    def _dependency(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
        membership = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == user.id, OrganizationMember.role.in_(allowed_roles))
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these roles: {', '.join(allowed_roles)}.",
            )
    return _dependency
