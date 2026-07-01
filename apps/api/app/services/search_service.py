"""
SearchService -- global search across datasets, shares, and templates
(Module 12).

SCOPE DECISION, stated plainly: this is deliberately "search-on-read"
against the existing tables (a handful of SQL ILIKE queries), NOT a
separate search index/projection table kept in sync with writes. The
architecture doc's Global Search section describes a future index-on-write
design for when data volume genuinely demands it -- at MVP scale (a
handful of datasets/shares/templates per user), querying live is simpler,
has zero synchronization risk (an index can never drift from reality if
there's no index), and is fast enough. This is the same "don't solve a
scaling problem that doesn't exist yet" discipline used throughout this
project. If this ever needs to become a real indexed search, the API
shape here doesn't have to change -- only what's behind it would.

What's searchable, and why these specific fields: a share's `token` is a
random opaque string nobody would naturally type into a search box, so
shares are ALSO matched by their underlying dataset's filename -- meaning
searching "employee" surfaces both the employees.csv dataset itself and
any shares created from it, which is what a person actually wants when
searching.
"""
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.share import Share
from app.models.template import Template

_MAX_RESULTS_PER_CATEGORY = 20


class SearchService:
    def __init__(self, db: Session):
        self.db = db

    def search(self, workspace_id: str, query: str) -> dict:
        pattern = f"%{query}%"

        datasets = (
            self.db.query(Dataset)
            .filter(
                Dataset.workspace_id == workspace_id,
                Dataset.deleted_at.is_(None),
                Dataset.original_filename.ilike(pattern),
            )
            .limit(_MAX_RESULTS_PER_CATEGORY)
            .all()
        )

        # Shares matched two ways: by their own token, OR by their
        # underlying dataset's filename (see module docstring for why).
        shares = (
            self.db.query(Share, Dataset.original_filename)
            .join(Dataset, Share.dataset_id == Dataset.id)
            .filter(
                Dataset.workspace_id == workspace_id,
                Share.deleted_at.is_(None),
                (Share.token.ilike(pattern) | Dataset.original_filename.ilike(pattern)),
            )
            .limit(_MAX_RESULTS_PER_CATEGORY)
            .all()
        )

        templates = (
            self.db.query(Template)
            .filter(
                Template.workspace_id == workspace_id,
                Template.deleted_at.is_(None),
                Template.name.ilike(pattern),
            )
            .limit(_MAX_RESULTS_PER_CATEGORY)
            .all()
        )

        return {
            "query": query,
            "datasets": [
                {"id": d.id, "original_filename": d.original_filename, "row_count": d.row_count}
                for d in datasets
            ],
            "shares": [
                {
                    "id": share.id,
                    "token": share.token,
                    "dataset_filename": filename,
                    "mode": share.mode,
                    "revoked": share.revoked,
                }
                for share, filename in shares
            ],
            "templates": [
                {"id": t.id, "name": t.name, "version": t.version} for t in templates
            ],
        }
