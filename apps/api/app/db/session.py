"""
Database engine and session setup — production-hardened.

Changes:
- pool_pre_ping=True: tests connection before use, prevents "stale connection"
  errors after Render's free tier restarts or sleeps
- pool_recycle=300: recycles connections every 5 minutes, prevents timeouts
  on long-running free-tier deployments
- expire_on_commit=False: prevents lazy-loading errors after commit in services
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if _is_sqlite else {}

# pool_pre_ping and pool_recycle don't apply to SQLite (it uses NullPool)
# but are safe to pass — SQLAlchemy ignores them for SQLite.
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,        # test connection health before use
    pool_recycle=300,          # recycle connections every 5 minutes
    echo=False,                # set True temporarily for query debugging
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,    # prevents DetachedInstanceError in services
    bind=engine,
)


def get_db() -> Session:
    """FastAPI dependency — yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
