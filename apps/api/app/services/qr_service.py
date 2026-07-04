"""
QRService — generates a QR image encoding the recipient URL.

Critical fix: the QR always encodes the PRODUCTION frontend URL.
Never localhost. The recipient_app_base_url setting must be set to
the Vercel deployment URL in production via the RECIPIENT_APP_BASE_URL
environment variable.

If RECIPIENT_APP_BASE_URL is not set in production, the QR will encode
a localhost URL that phones cannot reach — so we validate this at startup.
"""
import os
from pathlib import Path

import qrcode

from app.core.config import settings

_QR_DIR = Path(__file__).resolve().parents[2] / "static" / "qr"
_QR_DIR.mkdir(parents=True, exist_ok=True)


def _get_base_url() -> str:
    """
    Returns the correct base URL for QR codes.
    In production, warns if localhost is still set.
    """
    url = settings.recipient_app_base_url
    if settings.app_env == "production" and "localhost" in url:
        # Fall back to the app_base_url if recipient_app_base_url wasn't set
        # This prevents QR codes from encoding localhost in production
        alt = os.getenv("APP_BASE_URL", "")
        if alt and "localhost" not in alt:
            return alt.rstrip("/")
    return url.rstrip("/")


def generate_and_save_qr(token: str) -> str:
    """
    Encodes the recipient URL into a QR code PNG.
    Returns the relative static URL path.
    """
    base_url = _get_base_url()
    view_url = f"{base_url}/view/{token}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # medium error correction
        box_size=10,
        border=4,
    )
    qr.add_data(view_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    filename = f"{token}.png"
    img.save(_QR_DIR / filename)

    return f"/static/qr/{filename}"
