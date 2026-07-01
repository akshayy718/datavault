"""
DatasetService -- everything about turning an uploaded file into a
Dataset + DatasetRow rows + an initial FieldMapping.
"""
from sqlalchemy.orm import Session

from app.models.dataset import Dataset, DatasetRow, FieldMapping
from app.services.mapping_service import auto_generate_mapping
from app.services.spreadsheet_service import parse_spreadsheet


class DatasetError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class DatasetService:
    def __init__(self, db: Session):
        self.db = db

    def create_dataset(self, owner_id: str, workspace_id: str, filename: str, file_bytes: bytes) -> Dataset:
        try:
            columns, rows = parse_spreadsheet(filename, file_bytes)
        except Exception as exc:
            raise DatasetError(str(exc)) from exc

        schema_definition = [{"column_name": c, "data_type": "string"} for c in columns]
        dataset = Dataset(
            owner_id=owner_id,
            workspace_id=workspace_id,
            original_filename=filename,
            schema_definition=schema_definition,
            row_count=len(rows),
            created_by=owner_id,
        )
        self.db.add(dataset)
        self.db.flush()  # assigns dataset.id

        for idx, row in enumerate(rows):
            self.db.add(DatasetRow(
                dataset_id=dataset.id,
                row_index=idx,
                row_data=row,
                photo_url=row.get("Photo") or row.get("photo"),
            ))

        self.db.add(FieldMapping(
            dataset_id=dataset.id,
            mapping_spec=auto_generate_mapping(columns),
            is_auto_generated=True,
        ))

        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def list_datasets(self, workspace_id: str) -> list[Dataset]:
        return (
            self.db.query(Dataset)
            .filter(Dataset.workspace_id == workspace_id, Dataset.deleted_at.is_(None))
            .order_by(Dataset.created_at.desc())
            .all()
        )

    def get_dataset(self, dataset_id: str, requesting_user_id: str) -> Dataset:
        dataset = (
            self.db.query(Dataset)
            .filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None))
            .first()
        )
        if not dataset:
            raise DatasetError("Dataset not found.", status_code=404)
        # MVP authorization: owner-only. Real workspace-membership checks
        # are the same documented extension point as require_role() in
        # app/core/deps.py -- not guessed at here, left visible.
        if dataset.owner_id != requesting_user_id:
            raise DatasetError("You don't have access to this dataset.", status_code=403)
        return dataset

    def get_rows(self, dataset_id: str, requesting_user_id: str) -> list[DatasetRow]:
        dataset = self.get_dataset(dataset_id, requesting_user_id)  # also enforces access
        return (
            self.db.query(DatasetRow)
            .filter(DatasetRow.dataset_id == dataset.id)
            .order_by(DatasetRow.row_index)
            .all()
        )

    def get_default_mapping(self, dataset_id: str) -> FieldMapping | None:
        return (
            self.db.query(FieldMapping)
            .filter(FieldMapping.dataset_id == dataset_id)
            .order_by(FieldMapping.created_at.desc())
            .first()
        )
