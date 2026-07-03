"""
Database engine and session setup.

This is the only file in the codebase that should call create_engine().
Every service that needs a database session imports get_db() from here,
rather than constructing its own connection -- this is what makes it
possible to swap SQLite for PostgreSQL later by changing one config value
(DATABASE_URL) and nothing else (see Architecture doc, Section 5).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# `connect_args` is only needed for SQLite (it disallows cross-thread use
# by default, which FastAPI's request handling needs). This is the one
# SQLite-specific line in the whole data layer; it has no effect on
# PostgreSQL and can stay even after migrating.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
