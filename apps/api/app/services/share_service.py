"""
ShareService -- create a share, resolve a token for a recipient, revoke a
share. This is the code-level expression of the architecture's central
principle: "the share is the boundary, not the file."
"""
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.audit import AuditLog, ViewEvent
from app.models.dataset import Dataset, DatasetRow, FieldMapping
from app.models.share import Share, ShareSnapshot
from app.models.template import Template
from app.services.selection import SelectionError, extract_selection
from app.services.qr_service import generate_and_save_qr


class ShareError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _as_aware_utc(dt: datetime) -> datetime:
    # Same SQLite-naive-datetime fix as AuthService -- see that file's
    # docstring for the full explanation. Duplicated here rather than
    # imported because it's a two-line, self-contained helper; promoting
    # it to a shared utils module is a reasonable later cleanup once a
    # third place needs it.
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class ShareService:
    def __init__(self, db: Session):
        self.db = db

    # ---- Owner-side: create ----

    def create_share(
        self,
        dataset_id: str,
        owner_id: str,
        selection_type: str,
        selection_spec: dict,
        mode: str = "snapshot",
        format: str = "cards",
        template_id: str | None = None,
        pin: str | None = None,
        expires_at: datetime | None = None,
        max_views: int | None = None,
    ) -> Share:
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None)).first()
        if not dataset:
            raise ShareError("Dataset not found.", status_code=404)
        if dataset.owner_id != owner_id:
            raise ShareError("You don't have access to this dataset.", status_code=403)

        if template_id is not None:
            template = (
                self.db.query(Template)
                .filter(Template.id == template_id, Template.deleted_at.is_(None))
                .first()
            )
            if not template:
                raise ShareError("Template not found.", status_code=404)
            if template.workspace_id != dataset.workspace_id:
                raise ShareError("This template belongs to a different workspace than the dataset.", status_code=403)

        mapping = (
            self.db.query(FieldMapping)
            .filter(FieldMapping.dataset_id == dataset_id)
            .order_by(FieldMapping.created_at.desc())
            .first()
        )
        if not mapping:
            raise ShareError("No field mapping exists for this dataset yet.", status_code=422)

        rows = self._load_rows(dataset_id)

        try:
            extracted = extract_selection(rows, selection_type, selection_spec)
        except SelectionError as exc:
            raise ShareError(exc.message, status_code=400) from exc

        token = secrets.token_urlsafe(12)
        share = Share(
            dataset_id=dataset_id,
            token=token,
            mode=mode,
            selection_type=selection_type,
            selection_spec=selection_spec,
            field_mapping_id=mapping.id,
            template_id=template_id,
            format=format,
            pin_hash=hash_password(pin) if pin else None,
            expires_at=expires_at,
            max_views=max_views,
            created_by=owner_id,
        )
        self.db.add(share)
        self.db.flush()  # assigns share.id

        if mode == "snapshot":
            self.db.add(ShareSnapshot(share_id=share.id, frozen_data=extracted))
        # Live mode stores nothing extra here -- resolve_for_recipient()
        # re-runs extract_selection() against current rows at view time.

        share.qr_image_url = generate_and_save_qr(token)

        self.db.add(AuditLog(
            actor_user_id=owner_id,
            action="share.created",
            entity_type="share",
            entity_id=share.id,
            metadata_json={"mode": mode, "selection_type": selection_type},
        ))

        self.db.commit()
        self.db.refresh(share)
        return share

    # ---- Owner-side: revoke ----

    def revoke_share(self, share_id: str, owner_id: str) -> Share:
        share = self.db.query(Share).filter(Share.id == share_id).first()
        if not share:
            raise ShareError("Share not found.", status_code=404)
        if share.created_by != owner_id:
            raise ShareError("You don't have access to this share.", status_code=403)

        share.revoked = True
        self.db.add(AuditLog(
            actor_user_id=owner_id,
            action="share.revoked",
            entity_type="share",
            entity_id=share.id,
        ))
        self.db.commit()
        self.db.refresh(share)
        return share

    def get_share(self, share_id: str, owner_id: str) -> Share:
        share = self.db.query(Share).filter(Share.id == share_id).first()
        if not share:
            raise ShareError("Share not found.", status_code=404)
        if share.created_by != owner_id:
            raise ShareError("You don't have access to this share.", status_code=403)
        return share

    # ---- Recipient-side: resolve ----

    def resolve_for_recipient(
        self, token: str, pin: str | None, device_type: str | None, country: str | None,
        device_token: str | None = None,
    ) -> dict:
        share = self.db.query(Share).filter(Share.token == token).first()
        if not share:
            raise ShareError("This link doesn't exist.", status_code=404)

        if share.revoked or share.deleted_at is not None:
            raise ShareError("This share has been revoked.", status_code=410)

        if share.expires_at is not None and _as_aware_utc(share.expires_at) < datetime.now(timezone.utc):
            raise ShareError("This share has expired.", status_code=410)

        if share.max_views is not None and share.view_count >= share.max_views:
            raise ShareError("This share has reached its view limit.", status_code=410)

        if share.pin_hash is not None:
            if pin is None:
                raise ShareError("A PIN is required to view this share.", status_code=401)
            if not verify_password(pin, share.pin_hash):
                raise ShareError("Incorrect PIN.", status_code=401)

        # --- Resolve the actual data, per mode ---
        if share.mode == "snapshot":
            snapshot = self.db.query(ShareSnapshot).filter(ShareSnapshot.share_id == share.id).first()
            if not snapshot:
                # Shouldn't happen if create_share() ran correctly -- but
                # fail loudly and specifically rather than crash on a
                # missing-attribute error if it ever does.
                raise ShareError("Snapshot data is missing for this share.", status_code=500)
            extracted = snapshot.frozen_data
            captured_at = snapshot.captured_at.isoformat()
        else:  # live
            rows = self._load_rows(share.dataset_id)
            try:
                extracted = extract_selection(rows, share.selection_type, share.selection_spec)
            except SelectionError as exc:
                raise ShareError(exc.message, status_code=500) from exc
            captured_at = None

        # --- Record the view (always, on every successful resolution) ---
        share.view_count += 1
        self.db.add(ViewEvent(share_id=share.id, device_type=device_type, country=country, device_token=device_token))
        self.db.commit()

        template_data = None
        if share.template_id is not None:
            template = self.db.query(Template).filter(Template.id == share.template_id).first()
            if template is not None:
                template_data = {
                    "id": template.id,
                    "name": template.name,
                    "version": template.version,
                    "layout_spec": template.layout_spec,
                }

        return {
            "mode": share.mode,
            "captured_at": captured_at,
            "format": share.format,
            "template": template_data,
            "data": extracted,
        }

    def get_share_data_for_owner(self, share_id: str, owner_id: str) -> dict:
        """
        Returns the share's resolved data for the OWNER -- used by exports
        (Module 13) and any other owner-initiated action that needs the
        underlying data. Deliberately does NOT apply PIN/expiry/view-limit
        checks or increment view_count: those are recipient-facing access
        controls (per the architecture's "the share is the boundary, not
        the file" principle), not restrictions on the owner viewing their
        own data. An expired or PIN-protected share should still be
        exportable by its own owner.
        """
        share = self.db.query(Share).filter(Share.id == share_id).first()
        if not share:
            raise ShareError("Share not found.", status_code=404)
        if share.created_by != owner_id:
            raise ShareError("You don't have access to this share.", status_code=403)

        if share.mode == "snapshot":
            snapshot = self.db.query(ShareSnapshot).filter(ShareSnapshot.share_id == share.id).first()
            if not snapshot:
                raise ShareError("Snapshot data is missing for this share.", status_code=500)
            extracted = snapshot.frozen_data
        else:
            rows = self._load_rows(share.dataset_id)
            try:
                extracted = extract_selection(rows, share.selection_type, share.selection_spec)
            except SelectionError as exc:
                raise ShareError(exc.message, status_code=500) from exc

        return {"share": share, "data": extracted}

    # ---- Shared helper ----

    def _load_rows(self, dataset_id: str) -> list[dict]:
        rows = (
            self.db.query(DatasetRow)
            .filter(DatasetRow.dataset_id == dataset_id)
            .order_by(DatasetRow.row_index)
            .all()
        )
        return [r.row_data for r in rows]
