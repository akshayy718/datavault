"""
Encryption for secrets that must be RETRIEVED in their original form
later -- specifically, user-supplied BYOK AI provider keys.

This is deliberately separate from app/core/security.py's password
hashing. The distinction matters and is worth stating plainly: a
password or refresh token only ever needs to be VERIFIED ("does this
match what I stored?"), so it's hashed -- one-way, irreversible. A BYOK
key must be USED ("call the AI provider with this exact key on the
user's behalf"), so it must be encrypted -- reversible, with the actual
value recoverable. Hashing a BYOK key would make it permanently useless;
encrypting a password would make it (and every account) only as secure
as wherever the encryption key is stored. Using the wrong one of these
two for a given kind of secret is a real, serious security mistake --
this file exists so that mistake can't be made by accident.

Fernet (from the `cryptography` library) is used: authenticated
symmetric encryption (AES-128-CBC + HMAC), a well-vetted, standard
choice for exactly this kind of "encrypt an app secret at rest" need.
"""
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class CryptoError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _get_fernet() -> Fernet:
    if not settings.byok_encryption_key:
        raise CryptoError(
            "BYOK key storage is not configured. Set BYOK_ENCRYPTION_KEY in your "
            ".env (generate one with: python -c \"from cryptography.fernet import "
            'Fernet; print(Fernet.generate_key().decode())\") to enable BYOK.'
        )
    try:
        return Fernet(settings.byok_encryption_key.encode())
    except ValueError as exc:
        raise CryptoError(f"BYOK_ENCRYPTION_KEY is not a valid Fernet key: {exc}") from exc


def encrypt_secret(plaintext: str) -> str:
    fernet = _get_fernet()
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    fernet = _get_fernet()
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        # Either BYOK_ENCRYPTION_KEY changed since this was encrypted, or
        # the stored value was corrupted -- either way, the original key
        # is unrecoverable. Fail clearly rather than silently returning
        # garbage that would be sent to the AI provider as a "key."
        raise CryptoError(
            "Stored BYOK key could not be decrypted (the encryption key may have "
            "changed). Please re-enter your AI provider key.",
            status_code=500,
        ) from exc
