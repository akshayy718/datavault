"""
Global search route (Module 12). See app/services/search_service.py's
module docstring for the "search-on-read, no index" scope decision.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.search import SearchData, SearchResponse
from app.services.auth_service import AuthService
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(min_length=1, max_length=200, description="Search term"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    result = SearchService(db).search(workspace_id, q)
    return SearchResponse(data=SearchData(**result))
