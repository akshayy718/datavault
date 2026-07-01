"""
Importing every model module here ensures all tables are registered with
SQLAlchemy's metadata before create_all / Alembic autogenerate runs.
A model defined but never imported is invisible to both -- a classic bug.
"""
from app.models.identity import (  # noqa: F401
    User, Organization, OrganizationMember, Workspace, WorkspaceSettings,
)
from app.models.dataset import (  # noqa: F401
    Dataset, DatasetRow, FieldMapping, DatasetSnapshot,
)
from app.models.template import Template  # noqa: F401
from app.models.share import Share, ShareSnapshot, ShareAccessLog  # noqa: F401
from app.models.audit import ViewEvent, AuditLog, ErrorLog  # noqa: F401
from app.models.feature_flag import FeatureFlag  # noqa: F401
from app.models.auth import RefreshToken  # noqa: F401
from app.models.analytics import ShareViewDailyAggregate  # noqa: F401
from app.models.ai_usage import AIUsageLog  # noqa: F401
