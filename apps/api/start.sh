#!/bin/bash
# This script runs on Render every time the server starts.
# It first applies any database migrations (alembic upgrade head)
# then starts the actual FastAPI server.
# The $PORT variable is automatically set by Render.
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
