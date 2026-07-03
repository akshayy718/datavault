from pydantic import BaseModel


class ViewsByDay(BaseModel):
    day: str
    count: int


class RecentView(BaseModel):
    viewed_at: str
    device_type: str | None = None
    country: str | None = None


class ShareAnalyticsOut(BaseModel):
    share_id: str
    total_views: int
    view_count_on_share: int
    device_breakdown: dict[str, int]
    views_by_day: list[ViewsByDay]
    recent_views: list[RecentView]


class ShareAnalyticsResponse(BaseModel):
    data: ShareAnalyticsOut


class TopShare(BaseModel):
    share_id: str
    token: str
    view_count: int
    mode: str


class WorkspaceAnalyticsOut(BaseModel):
    workspace_id: str
    total_shares: int
    total_views: int
    top_shares: list[TopShare]


class WorkspaceAnalyticsResponse(BaseModel):
    data: WorkspaceAnalyticsOut
