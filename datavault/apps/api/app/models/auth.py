"""
RefreshToken model.

Why store refresh tokens in the database at all, instead of relying purely
on the JWT's own expiry? A JWT, once issued, is valid until it expires --
there's no way to invalidate it early just by deciding to. That's fine for
short-lived access tokens (15 min, per config), but unacceptable for
refresh tokens that live for days: if a user logs out, or you suspect a
token was stolen, you need a way to kill it immediately. Storing a hash of
each issued refresh token here, with a `revoked_at` column, is what makes
POST /auth/logout actually mean something instead of just deleting a
cookie client-side and hoping for the best.

We store a HASH of the token, never the raw token, for the same reason
passwords are hashed: if this table were ever exposed, the hashes alone
are useless to an attacker.
"""
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import new_uuid, utcnow


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
