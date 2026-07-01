"""
AIKeyConfigService -- lets a user switch between the platform's AI key
and their own (BYOK), per Module 14.

CRITICAL DESIGN RULE, stated plainly because getting this wrong defeats
the entire point of the feature: if mode='byok' is selected but no key
is actually stored, AI calls must FAIL with a clear error -- never
silently fall back to the platform key. A silent fallback would let a
user believe they're protecting platform costs by using their own key
while actually still consuming the shared platform quota, which is
exactly the cost-leakage problem this module exists to prevent. See
AIService.resolve_api_key_for_user() for where this rule is enforced.
"""
from sqlalchemy.orm import Session

from app.core.crypto import CryptoError, decrypt_secret, encrypt_secret
from app.models.ai_key_config import AIKeyConfig


class AIKeyConfigError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _mask_key(raw_key: str) -> str:
    """Never return a stored key in full once saved -- same principle as
    API key handling elsewhere (architecture doc: 'shown once at creation
    only'). A short prefix/suffix is enough for the user to recognize
    which key is configured without re-exposing the whole secret."""
    if len(raw_key) <= 8:
        return "****"
    return f"{raw_key[:4]}...{raw_key[-4:]}"


class AIKeyConfigService:
    def __init__(self, db: Session):
        self.db = db

    def get_config(self, user_id: str) -> dict:
        config = self.db.query(AIKeyConfig).filter(AIKeyConfig.user_id == user_id).first()
        if not config:
            # No row yet = platform mode by default, no key configured.
            return {"mode": "platform", "has_key": False, "key_preview": None}

        key_preview = None
        if config.encrypted_key:
            try:
                key_preview = _mask_key(decrypt_secret(config.encrypted_key))
            except CryptoError:
                # If decryption fails (e.g. BYOK_ENCRYPTION_KEY rotated),
                # still report mode/has_key honestly -- just without a
                # preview, rather than raising and breaking a routine
                # "what's my current config" check.
                key_preview = "(unavailable)"

        return {"mode": config.mode, "has_key": config.encrypted_key is not None, "key_preview": key_preview}

    def set_config(self, user_id: str, mode: str, api_key: str | None) -> dict:
        if mode not in ("platform", "byok"):
            raise AIKeyConfigError(f"Invalid mode '{mode}'. Must be 'platform' or 'byok'.")

        if mode == "byok" and not api_key:
            existing = self.db.query(AIKeyConfig).filter(AIKeyConfig.user_id == user_id).first()
            if not existing or not existing.encrypted_key:
                raise AIKeyConfigError(
                    "Switching to BYOK mode requires providing an api_key "
                    "(no key is currently stored for this account).",
                    status_code=422,
                )

        config = self.db.query(AIKeyConfig).filter(AIKeyConfig.user_id == user_id).first()
        if not config:
            config = AIKeyConfig(user_id=user_id, mode=mode)
            self.db.add(config)

        config.mode = mode
        if api_key:
            try:
                config.encrypted_key = encrypt_secret(api_key)
            except CryptoError as exc:
                raise AIKeyConfigError(exc.message, exc.status_code) from exc

        self.db.commit()
        self.db.refresh(config)
        return self.get_config(user_id)

    def clear_config(self, user_id: str) -> None:
        config = self.db.query(AIKeyConfig).filter(AIKeyConfig.user_id == user_id).first()
        if config:
            self.db.delete(config)
            self.db.commit()
