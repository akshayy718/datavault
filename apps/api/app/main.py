"""
Application entrypoint — production-hardened.

Changes from MVP:
- GZipMiddleware for response compression (reduces payload size ~60-70%)
- CORS tightened: explicit origins from env var, wildcard only in dev
- Connection pooling: pool_pre_ping + pool_recycle for long-running deploys
- Static dir auto-created at startup
"""
from pathlib import Path
import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.routes import ai, analytics, auth, datasets, recipient, search, shares, templates
from app.core.config import settings

app = FastAPI(
    title="DataVault API",
    version="1.0.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None,
)

# ── GZip compression ─────────────────────────────────────────────────────────
# Compresses responses > 1KB. Significantly reduces payload size for
# analytics, row data, and share responses — critical for slow mobile networks.
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, restrict to known frontend domains.
# In development, allow all origins for convenience.
_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://datavault-gilt.vercel.app",
    "https://datavault-git-main-akshaysanthosh718.vercel.app",
]

# Allow any additional origins from environment variable (comma-separated)
_extra = os.getenv("ALLOWED_ORIGINS", "")
if _extra:
    _allowed_origins.extend([o.strip() for o in _extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins if settings.app_env == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1")
app.include_router(datasets.router,  prefix="/api/v1")
app.include_router(shares.router,    prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(ai.router,        prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(search.router,    prefix="/api/v1")
app.include_router(recipient.router)  # public, no /api/v1 prefix

# ── Static files ─────────────────────────────────────────────────────────────
_static_dir = Path(__file__).resolve().parent.parent / "static"
_static_dir.mkdir(exist_ok=True)
((_static_dir / "qr")).mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


# ── Health endpoints ──────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "env": settings.app_env}


@app.get("/health/db", tags=["Health"])
def health_check_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
