"""
RecipientSessionService -- recently-viewed + saved cards, no login
(Module 10). device_token is opaque, generated server-side on first
contact if the client doesn't supply one, then stored client-side
(e.g. localStorage) and sent back on subsequent calls.
"""
import secrets

from sqlalchemy.orm import Session

from app.models.audit import ViewEvent
from app.models.dataset import Dataset
from app.models.recipient_session import RecipientSession, SavedCard
from app.models.share import Share

_RECENTLY_VIEWED_LIMIT = 20


class SessionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class RecipientSessionService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_device_token(self, device_token: str | None) -> str:
        if device_token:
            existing = self.db.query(RecipientSession).filter(RecipientSession.device_token == device_token).first()
            if existing:
                return device_token
        new_token = secrets.token_urlsafe(16)
        self.db.add(RecipientSession(device_token=new_token))
        self.db.commit()
        return new_token

    def recently_viewed(self, device_token: str) -> list[dict]:
        events = (
            self.db.query(ViewEvent, Share, Dataset.original_filename)
            .join(Share, ViewEvent.share_id == Share.id)
            .join(Dataset, Share.dataset_id == Dataset.id)
            .filter(ViewEvent.device_token == device_token)
            .order_by(ViewEvent.viewed_at.desc())
            .limit(_RECENTLY_VIEWED_LIMIT)
            .all()
        )
        seen_shares = set()
        results = []
        for event, share, filename in events:
            if share.id in seen_shares:
                continue  # dedupe -- show each share once, most recent view
            seen_shares.add(share.id)
            results.append({
                "share_id": share.id,
                "token": share.token,
                "dataset_filename": filename,
                "viewed_at": event.viewed_at.isoformat(),
            })
        return results

    def save_card(self, device_token: str, share_id: str) -> dict:
        share = self.db.query(Share).filter(Share.id == share_id, Share.deleted_at.is_(None)).first()
        if not share:
            raise SessionError("Share not found.", status_code=404)

        session = self.db.query(RecipientSession).filter(RecipientSession.device_token == device_token).first()
        if not session:
            raise SessionError("Unknown device_token. Call GET /recipient/session first.", status_code=404)

        existing = (
            self.db.query(SavedCard)
            .filter(SavedCard.recipient_session_id == session.id, SavedCard.share_id == share_id)
            .first()
        )
        if existing:
            return {"saved": True, "already_existed": True}

        self.db.add(SavedCard(recipient_session_id=session.id, share_id=share_id))
        self.db.commit()
        return {"saved": True, "already_existed": False}

    def list_saved_cards(self, device_token: str) -> list[dict]:
        session = self.db.query(RecipientSession).filter(RecipientSession.device_token == device_token).first()
        if not session:
            return []
        rows = (
            self.db.query(SavedCard, Share, Dataset.original_filename)
            .join(Share, SavedCard.share_id == Share.id)
            .join(Dataset, Share.dataset_id == Dataset.id)
            .filter(SavedCard.recipient_session_id == session.id)
            .order_by(SavedCard.saved_at.desc())
            .all()
        )
        return [
            {
                "share_id": share.id,
                "token": share.token,
                "dataset_filename": filename,
                "saved_at": card.saved_at.isoformat(),
            }
            for card, share, filename in rows
        ]

    def unsave_card(self, device_token: str, share_id: str) -> None:
        session = self.db.query(RecipientSession).filter(RecipientSession.device_token == device_token).first()
        if not session:
            return
        self.db.query(SavedCard).filter(
            SavedCard.recipient_session_id == session.id, SavedCard.share_id == share_id
        ).delete()
        self.db.commit()
