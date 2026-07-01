"""
Shared SQLAlchemy declarative base.

Every model in app/models/ inherits from this Base so Alembic's
autogenerate (and our manually-written migration in migrations/versions/)
can see all tables in one place.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
