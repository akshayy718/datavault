from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ShareCreateRequest(BaseModel):
    dataset_id: str
    selection_type: Literal["cell", "row", "column", "range", "filter"]
    selection_spec: dict
    mode: Literal["snapshot", "live"] = "snapshot"
    format: str = "cards"
    template_id: str | None = None
    pin: str | None = Field(default=None, min_length=4, max_length=20)
    expires_at: datetime | None = None
    max_views: int | None = Field(default=None, ge=1)


class ShareOut(BaseModel):
    id: str
    token: str
    mode: str
    format: str
    template_id: str | None = None
    qr_image_url: str | None = None
    view_count: int
    revoked: bool
    expires_at: datetime | None = None
    max_views: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ShareResponse(BaseModel):
    data: ShareOut


class UnlockRequest(BaseModel):
    pin: str


class RecipientTemplateData(BaseModel):
    id: str
    name: str
    version: int
    layout_spec: list


class RecipientViewData(BaseModel):
    mode: str
    captured_at: str | None = None
    format: str
    template: RecipientTemplateData | None = None
    data: dict


class RecipientViewResponse(BaseModel):
    data: RecipientViewData
