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
    by_key_mode: dict[str, AIFeatureUsage]


class AIUsageResponse(BaseModel):
    data: AIUsageData


class AIDashboardData(BaseModel):
    dashboard: dict


class AIDashboardResponse(BaseModel):
    data: AIDashboardData


class AIReportData(BaseModel):
    report_text: str


class AIReportResponse(BaseModel):
    data: AIReportData


class CleanupChange(BaseModel):
    row_index: int
    field: str
    current_value: str | None = None
    suggested_value: str | None = None
    reason: str | None = None


class AICleanupProposeData(BaseModel):
    proposed_changes: list[dict]
    rows_reviewed: int


class AICleanupProposeResponse(BaseModel):
    data: AICleanupProposeData


class CleanupApplyChange(BaseModel):
    row_index: int
    field: str
    new_value: str


class AICleanupApplyRequest(BaseModel):
    dataset_id: str
    changes: list[CleanupApplyChange]


class AICleanupApplyData(BaseModel):
    applied_count: int


class AICleanupApplyResponse(BaseModel):
    data: AICleanupApplyData


class AIKeyConfigSetRequest(BaseModel):
    mode: str = Field(pattern="^(platform|byok)$")
    api_key: str | None = Field(default=None, max_length=200)


class AIKeyConfigData(BaseModel):
    mode: str
    has_key: bool
    key_preview: str | None = None


class AIKeyConfigResponse(BaseModel):
    data: AIKeyConfigData
