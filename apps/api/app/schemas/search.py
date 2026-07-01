from pydantic import BaseModel


class SearchDatasetResult(BaseModel):
    id: str
    original_filename: str
    row_count: int


class SearchShareResult(BaseModel):
    id: str
    token: str
    dataset_filename: str
    mode: str
    revoked: bool


class SearchTemplateResult(BaseModel):
    id: str
    name: str
    version: int


class SearchData(BaseModel):
    query: str
    datasets: list[SearchDatasetResult]
    shares: list[SearchShareResult]
    templates: list[SearchTemplateResult]


class SearchResponse(BaseModel):
    data: SearchData
