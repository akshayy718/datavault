from pydantic import BaseModel, Field


class AIQueryRequest(BaseModel):
    dataset_id: str
    query: str = Field(min_length=1, max_length=500)


class AIQueryData(BaseModel):
    interpreted_filter: dict
    result_rows: list[dict]
    row_count: int


class AIQueryResponse(BaseModel):
    data: AIQueryData


class AIAnomaliesRequest(BaseModel):
    dataset_id: str


class AnomalyItem(BaseModel):
    row_index: int
    reason: str


class AIAnomaliesData(BaseModel):
    anomalies: list[AnomalyItem]
    rows_reviewed: int


class AIAnomaliesResponse(BaseModel):
    data: AIAnomaliesData


class AIFeatureUsage(BaseModel):
    calls: int
    tokens: int
    estimated_cost: float


class AIUsageData(BaseModel):
    total_calls: int
    total_tokens: int
    total_estimated_cost: float
    by_feature: dict[str, AIFeatureUsage]


class AIUsageResponse(BaseModel):
    data: AIUsageData
