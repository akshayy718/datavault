"""
AnalyticsService -- per-share and per-workspace view analytics.

MVP scope decision: aggregation runs on-read (computed from ViewEvent at
request time), not via a separate scheduled job. The Database Design doc
describes a daily rollup table specifically to avoid repeated heavy
queries at scale -- but at MVP traffic levels, querying ViewEvent
directly is simpler to build and verify, and the rollup table exists
(see app/models/analytics.py) so a real scheduled aggregation job is a
clean later addition, not a redesign. This is the same "don't
over-engineer before there's a real scaling problem" discipline used
throughout this project.
"""
from collections import Counter
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.audit import ViewEvent
from app.models.dataset import Dataset
from app.models.share import Share


class AnalyticsError(Exception):
    def __init__(self, message: str, status_code: int = 404):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_share_analytics(self, share_id: str, requesting_user_id: str) -> dict:
        share = self.db.query(Share).filter(Share.id == share_id).first()
        if not share:
            raise AnalyticsError("Share not found.", status_code=404)
        if share.created_by != requesting_user_id:
            raise AnalyticsError("You don't have access to this share.", status_code=403)

        events = self.db.query(ViewEvent).filter(ViewEvent.share_id == share_id).all()

        device_breakdown = Counter(e.device_type or "unknown" for e in events)
        views_by_day: Counter[date] = Counter()
        for e in events:
            views_by_day[e.viewed_at.date()] += 1

        return {
            "share_id": share_id,
            "total_views": len(events),
            "view_count_on_share": share.view_count,  # cross-check: should match total_views
            "device_breakdown": dict(device_breakdown),
            "views_by_day": [
                {"day": day.isoformat(), "count": count}
                for day, count in sorted(views_by_day.items())
            ],
            "recent_views": [
                {
                    "viewed_at": e.viewed_at.isoformat(),
                    "device_type": e.device_type,
                    "country": e.country,
                }
                for e in sorted(events, key=lambda e: e.viewed_at, reverse=True)[:20]
            ],
        }

    def get_workspace_analytics(self, workspace_id: str, requesting_user_id: str) -> dict:
        # MVP authorization: same pattern as DatasetService -- owner-only
        # for now, via the dataset->workspace link. Real workspace-role
        # checks are the same documented extension point noted elsewhere
        # (app/core/deps.py's require_role), not guessed at here.
        dataset_ids = [
            d.id for d in self.db.query(Dataset.id)
            .filter(Dataset.workspace_id == workspace_id, Dataset.owner_id == requesting_user_id)
            .all()
        ]
        if not dataset_ids:
            return {
                "workspace_id": workspace_id,
                "total_shares": 0,
                "total_views": 0,
                "top_shares": [],
            }

        shares = self.db.query(Share).filter(Share.dataset_id.in_(dataset_ids)).all()
        share_ids = [s.id for s in shares]

        total_views = (
            self.db.query(func.count(ViewEvent.id))
            .filter(ViewEvent.share_id.in_(share_ids))
            .scalar()
            if share_ids else 0
        )

        top_shares = sorted(shares, key=lambda s: s.view_count, reverse=True)[:10]

        return {
            "workspace_id": workspace_id,
            "total_shares": len(shares),
            "total_views": total_views or 0,
            "top_shares": [
                {"share_id": s.id, "token": s.token, "view_count": s.view_count, "mode": s.mode}
                for s in top_shares
            ],
        }
