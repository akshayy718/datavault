"""
QRService -- generates a QR image encoding a share's recipient URL.

MVP storage decision (per the Architecture doc's Section 6 and the
Storage section's note on object storage being a later-phase concern):
QR images are written to local disk under a static/ directory and served
by FastAPI's StaticFiles mount. This is a deliberate, documented
simplification -- swapping to real object storage (S3-compatible bucket
+ CDN) later means changing where save_qr_image() writes to and what URL
it returns, nothing else in the codebase needs to change.
"""
from pathlib import Path

import qrcode

from app.core.config import settings

_QR_DIR = Path(__file__).resolve().parents[2] / "static" / "qr"
_QR_DIR.mkdir(parents=True, exist_ok=True)


def generate_and_save_qr(token: str) -> str:
    """
    Encodes the recipient-facing URL (never any raw data -- per the
    Architecture doc's QR Generation section, the QR always points at a
    token-based URL, so revoking/expiring/converting the share's mode
    later doesn't require regenerating the QR image itself).

    Returns a relative URL path the API serves the image at.
    """
    view_url = f"{settings.recipient_app_base_url}/view/{token}"

    qr = qrcode.QRCode(version=None, box_size=10, border=4)
    qr.add_data(view_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    filename = f"{token}.png"
    img.save(_QR_DIR / filename)

    return f"/static/qr/{filename}"
