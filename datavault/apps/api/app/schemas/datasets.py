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
