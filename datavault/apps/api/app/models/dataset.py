"""
Dataset models.

`Dataset` holds metadata + the detected column schema. `DatasetRow` holds
the actual cell values as flexible JSON, because every uploaded spreadsheet
has a different, unpredictable column shape.

`DatasetSnapshot` (improvement #5) stores a frozen copy of an entire
dataset's data at a point in time. This is distinct from `ShareSnapshot`:
- ShareSnapshot freezes the *slice* a single share points at.
- DatasetSnapshot freezes the *whole dataset*, which is what makes
  dataset-level Snapshot vs Live behavior possible (e.g. "share this
  dataset as it looked on the 1st" vs "always reflect the latest rows"),
  and is the basis for restoring/recovering a dataset to a prior state.
"""
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import BaseEntity, SoftDeleteMixin, TimestampMixin, new_uuid


class Dataset(Base, BaseEntity, SoftDeleteMixin):
    # Soft-deletable: an uploaded spreadsheet is costly to lose by accident.
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    schema_definition: Mapped[dict] = mapped_column(JSON, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    rows: Mapped[list["DatasetRow"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    field_mappings: Mapped[list["FieldMapping"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    snapshots: Mapped[list["DatasetSnapshot"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class DatasetRow(Base, TimestampMixin):
    __tablename__ = "dataset_rows"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    row_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)

    dataset: Mapped["Dataset"] = relationship(back_populates="rows")


class FieldMapping(Base, TimestampMixin):
    __tablename__ = "field_mappings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    # e.g. {"Title": "Name", "Avatar": "Photo", "Subtitle": "Department"}
    mapping_spec: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_auto_generated: Mapped[bool] = mapped_column(default=True, nullable=False)

    dataset: Mapped["Dataset"] = relationship(back_populates="field_mappings")


class DatasetSnapshot(Base, TimestampMixin):
    """
    A frozen copy of an entire dataset's rows at a point in time
    (improvement #5). Append-only in practice -- you create snapshots,
    you don't edit them. `snapshot_json` holds the full row set as it
    existed at `created_at`.
    """
    __tablename__ = "dataset_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Optional human label, e.g. "End of Q2" -- handy for the UI later.
    label: Mapped[str | None] = mapped_column(String, nullable=True)

    dataset: Mapped["Dataset"] = relationship(back_populates="snapshots")
