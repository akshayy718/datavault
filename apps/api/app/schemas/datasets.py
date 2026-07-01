from datetime import datetime

from pydantic import BaseModel


class SchemaColumn(BaseModel):
    column_name: str
    data_type: str


class DatasetOut(BaseModel):
    id: str
    original_filename: str
    schema_definition: list[SchemaColumn]
    row_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetResponse(BaseModel):
    data: DatasetOut


class DatasetListResponse(BaseModel):
    data: list[DatasetOut]


class DatasetRowOut(BaseModel):
    id: str
    row_index: int
    row_data: dict
    photo_url: str | None = None

    class Config:
        from_attributes = True


class DatasetRowsResponse(BaseModel):
    data: list[DatasetRowOut]


class ManualMappingCreateRequest(BaseModel):
    mapping_spec: dict  # e.g. {"Title": "Name", "Avatar": "Photo", "Subtitle": "Department"}


class FieldMappingOut(BaseModel):
    id: str
    dataset_id: str
    mapping_spec: dict
    is_auto_generated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FieldMappingResponse(BaseModel):
    data: FieldMappingOut


class FieldMappingListResponse(BaseModel):
    data: list[FieldMappingOut]
