"""
Template routes -- the Template Builder backend (Module 7).

Note the deliberate API shape: there is no PUT/PATCH that edits an
existing template's layout_spec. "Editing" a template is always
POST /templates/{id}/versions, which creates a NEW Template row. This
mirrors the versioning rule at the API surface itself -- it's structurally
impossible to accidentally mutate a template already in use by a share,
the same pattern used for AI cleanup's separate propose/apply endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.templates import (
    TemplateCreateRequest,
    TemplateListResponse,
    TemplateOut,
    TemplateResponse,
    TemplateVersionRequest,
)
from app.services.auth_service import AuthService
from app.services.template_service import TemplateError, TemplateService

router = APIRouter(prefix="/templates", tags=["templates"])


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(
    payload: TemplateCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    try:
        template = TemplateService(db).create_template(workspace_id, user.id, payload.name, payload.layout_spec)
    except TemplateError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return TemplateResponse(data=TemplateOut.model_validate(template))


@router.get("", response_model=TemplateListResponse)
def list_templates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns only the latest version of each template -- see TemplateService's
    module docstring for why a flat list of every version would be noisy."""
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    templates = TemplateService(db).list_templates(workspace_id)
    return TemplateListResponse(data=[TemplateOut.model_validate(t) for t in templates])


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    try:
        template = TemplateService(db).get_template(template_id, workspace_id)
    except TemplateError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return TemplateResponse(data=TemplateOut.model_validate(template))


@router.get("/{template_id}/versions", response_model=TemplateListResponse)
def list_template_versions(template_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full version history for one template lineage, oldest to newest."""
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    try:
        versions = TemplateService(db).list_versions(template_id, workspace_id)
    except TemplateError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return TemplateListResponse(data=[TemplateOut.model_validate(t) for t in versions])


@router.post("/{template_id}/versions", response_model=TemplateResponse, status_code=201)
def create_template_version(
    template_id: str,
    payload: TemplateVersionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The ONLY way to 'edit' a template -- always creates a new version row."""
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    try:
        new_version = TemplateService(db).create_new_version(
            template_id, workspace_id, user.id, payload.layout_spec, payload.name
        )
    except TemplateError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return TemplateResponse(data=TemplateOut.model_validate(new_version))
