"""
seed-demo: populate the database with realistic demo data for portfolio
demos and local development (improvement #6).

Run with:  python -m app.seed   (from apps/api, with the venv active)

What it creates:
  - a demo user (known credentials, clearly demo-only)
  - a demo organization + workspace + workspace settings
  - the employee benchmark dataset (from infra/seed-data/employees.csv)
  - an auto-generated field mapping for it
  - one Snapshot-mode QR share of a single employee row

Idempotency: running this twice won't create duplicate users -- it checks
for the demo user by email first and exits early if seeding already ran.
This matters because re-running a half-finished seed is exactly the kind
of thing you do while debugging, and it shouldn't pile up duplicate data.

NOTE: password hashing here is a deliberate PLACEHOLDER. Real hashing
(bcrypt/argon2) is implemented in the Auth module, which hasn't been built
yet. The seeded user is not meant to be logged into until then -- it exists
so datasets/shares have a valid owner to attach to. This is called out
loudly so it's never mistaken for production-ready auth.
"""
import csv
import secrets
from pathlib import Path

from app.db.session import SessionLocal
from app.models.identity import (
    User, Organization, OrganizationMember, Workspace, WorkspaceSettings,
)
from app.models.dataset import Dataset, DatasetRow, FieldMapping
from app.models.share import Share, ShareSnapshot
from app.services.mapping_service import auto_generate_mapping

DEMO_EMAIL = "demo@datavault.local"
SEED_DATA_DIR = Path(__file__).resolve().parents[3] / "infra" / "seed-data"


def _placeholder_hash(password: str) -> str:
    # PLACEHOLDER ONLY -- replaced by real hashing in the Auth module.
    return f"PLACEHOLDER_NOT_A_REAL_HASH::{password}"


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print("Demo data already seeded (found demo user). Nothing to do.")
            return

        # 1. Demo user
        user = User(
            email=DEMO_EMAIL,
            password_hash=_placeholder_hash("demo-password-123"),
            name="Demo User",
        )
        db.add(user)
        db.flush()  # assigns user.id without committing yet

        # 2. Organization + workspace + settings
        org = Organization(name="Demo Org", created_by=user.id)
        db.add(org)
        db.flush()

        db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="admin"))

        workspace = Workspace(organization_id=org.id, name="Demo Workspace", created_by=user.id)
        db.add(workspace)
        db.flush()

        db.add(WorkspaceSettings(workspace_id=workspace.id, default_share_mode="snapshot"))

        # 3. Employee dataset from the benchmark CSV
        csv_path = SEED_DATA_DIR / "employees.csv"
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            columns = reader.fieldnames or []
            rows = list(reader)

        schema_def = [{"column_name": c, "data_type": "string"} for c in columns]
        dataset = Dataset(
            owner_id=user.id,
            workspace_id=workspace.id,
            original_filename="employees.csv",
            schema_definition=schema_def,
            row_count=len(rows),
            created_by=user.id,
        )
        db.add(dataset)
        db.flush()

        for idx, row in enumerate(rows):
            db.add(DatasetRow(
                dataset_id=dataset.id,
                row_index=idx,
                row_data=row,
                photo_url=row.get("Photo"),
            ))

        # 4. Auto-generated field mapping
        mapping = FieldMapping(
            dataset_id=dataset.id,
            mapping_spec=auto_generate_mapping(columns),
            is_auto_generated=True,
        )
        db.add(mapping)
        db.flush()

        # 5. One Snapshot-mode QR share of the first employee row
        token = secrets.token_urlsafe(12)
        share = Share(
            dataset_id=dataset.id,
            token=token,
            mode="snapshot",
            selection_type="row",
            selection_spec={"row_index": 0},
            field_mapping_id=mapping.id,
            format="cards",
            created_by=user.id,
        )
        db.add(share)
        db.flush()

        # Freeze the slice the share points at (Snapshot mode)
        db.add(ShareSnapshot(share_id=share.id, frozen_data=rows[0]))

        db.commit()

        print("Seed complete.")
        print(f"  Demo user:      {DEMO_EMAIL}  (password: demo-password-123, NOT usable until Auth module)")
        print(f"  Workspace:      {workspace.name}  ({workspace.id})")
        print(f"  Dataset:        employees.csv  ({len(rows)} rows)")
        print(f"  Sample share:   /view/{token}  (Snapshot mode, employee row 0)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
