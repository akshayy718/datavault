"""
Application entrypoint.

Authenticated owner routes (auth, datasets, shares) are mounted under
/api/v1 per the versioning convention. The public recipient router is
mounted WITHOUT that prefix and WITHOUT any auth -- a deliberate,
visible distinction matching the Architecture doc's separation of
"owner dashboard" from "recipient view" as fundamentally different
audiences (see app/routes/recipient.py's docstring).
"""
from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.routes import ai, analytics, auth, datasets, recipient, search, shares, templates

app = FastAPI(title="DataVault API", version="0.1.0")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(datasets.router, prefix="/api/v1")
app.include_router(shares.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(recipient.router)  # public, no /api/v1 prefix, no auth

# Serves generated QR images. MVP-only: see app/services/qr_service.py's
# docstring for why this is local disk + StaticFiles rather than object
# storage + CDN -- swapping that out later doesn't touch this mount point
# at the application-routing level, only qr_service.py's save/URL logic.
_static_dir = Path(__file__).resolve().parent.parent / "static"
_static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
