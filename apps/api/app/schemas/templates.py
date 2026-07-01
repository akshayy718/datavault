from datetime import datetime

from pydantic import BaseModel, Field


class TemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    layout_spec: list = Field(min_length=1)


class TemplateVersionRequest(BaseModel):
    layout_spec: list = Field(min_length=1)
    name: str | None = None  # optional rename alongside the new version


class TemplateOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    layout_spec: list
    version: int
    parent_template_id: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateResponse(BaseModel):
    data: TemplateOut


class TemplateListResponse(BaseModel):
    data: list[TemplateOut]
