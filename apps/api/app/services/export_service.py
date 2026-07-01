"""
ExportService -- CSV, PNG, and PDF export for a share's data (Module 13).

Scope decision, per the priority list this was built against: "Share
Package" (a bundled export of data + template + mapping + versioning
info) is explicitly skipped for now -- these three formats are what
people actually reach for first.

Design decision worth knowing: PNG and PDF share ONE rendering function,
_render_card_image(). Pillow can save an in-memory image directly as a
PDF (img.save(buffer, format="PDF")) -- so rather than pulling in a
separate, heavier PDF library (reportlab, fpdf2, weasyprint) and
maintaining two parallel rendering code paths that could visually drift
apart, both formats render through the exact same drawing code and only
differ in which format Pillow saves to at the very last step. If the
PNG export ever looks wrong, the PDF export has the identical bug --
that's a feature of this design, not a gap, since it means one fix
covers both.

The rendering itself is deliberately simple (default font, no custom
typography, no template-aware layout) -- this is the backend's job to
produce a CORRECT, readable export; making it match a template's
specific visual design is frontend/rendering work for a later phase, not
something to build into a Pillow script now.
"""
import csv
import io
from typing import Literal

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from app.services.share_service import ShareError, ShareService

ExportFormat = Literal["csv", "png", "pdf"]

_CARD_WIDTH = 800
_PADDING = 40
_LINE_HEIGHT = 32
_TITLE_LINE_HEIGHT = 44


class ExportError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def export_share(self, share_id: str, owner_id: str, export_format: ExportFormat) -> tuple[bytes, str, str]:
        """Returns (file_bytes, content_type, filename)."""
        try:
            result = ShareService(self.db).get_share_data_for_owner(share_id, owner_id)
        except ShareError as exc:
            raise ExportError(exc.message, exc.status_code) from exc

        share = result["share"]
        data = result["data"]
        rows = self._normalize_to_rows(data)

        if export_format == "csv":
            content = self._render_csv(rows)
            return content, "text/csv", f"share-{share.token}.csv"
        elif export_format == "png":
            content = self._render_card_image(rows, output_format="PNG")
            return content, "image/png", f"share-{share.token}.png"
        elif export_format == "pdf":
            content = self._render_card_image(rows, output_format="PDF")
            return content, "application/pdf", f"share-{share.token}.pdf"
        else:
            raise ExportError(f"Unsupported export format: '{export_format}'.")

    # ---- Helpers ----

    def _normalize_to_rows(self, data: dict) -> list[dict]:
        """
        A share's resolved data is either {"kind": "single", "fields": {...}}
        or {"kind": "multi", "items": [...]} -- normalize both into a plain
        list of row dicts so the CSV/image renderers only need to handle
        one shape.
        """
        if data.get("kind") == "single":
            return [data["fields"]]
        return data.get("items", [])

    def _render_csv(self, rows: list[dict]) -> bytes:
        if not rows:
            return b""
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
        return buffer.getvalue().encode("utf-8")

    def _render_card_image(self, rows: list[dict], output_format: Literal["PNG", "PDF"]) -> bytes:
        font = ImageFont.load_default()
        # Pillow's default bitmap font has no real "bold" variant available
        # without bundling a font file, so the title is distinguished by
        # being on its own line with more vertical breathing room instead
        # of by weight -- a deliberate, zero-dependency-risk simplification.

        line_count_per_row = sum(len(r) for r in rows) if rows else 1
        height = _PADDING * 2 + (_TITLE_LINE_HEIGHT * max(len(rows), 1)) + (line_count_per_row * _LINE_HEIGHT)

        img = Image.new("RGB", (_CARD_WIDTH, height), color="white")
        draw = ImageDraw.Draw(img)

        y = _PADDING
        for i, row in enumerate(rows):
            if not row:
                continue
            first_key, first_value = next(iter(row.items()))
            draw.text((_PADDING, y), str(first_value), fill="black", font=font)
            y += _TITLE_LINE_HEIGHT

            for key, value in row.items():
                draw.text((_PADDING + 20, y), f"{key}: {value}", fill=(60, 60, 60), font=font)
                y += _LINE_HEIGHT

            if i < len(rows) - 1:
                draw.line([(_PADDING, y), (_CARD_WIDTH - _PADDING, y)], fill=(220, 220, 220), width=1)
                y += 10

        buffer = io.BytesIO()
        img.save(buffer, format=output_format)
        return buffer.getvalue()
