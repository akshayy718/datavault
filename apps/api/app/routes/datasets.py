"""
Dataset routes. Thin -- validate, call DatasetService, translate
DatasetError into HTTP, done.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.identity import User
from app.schemas.datasets import (
    DatasetListResponse,
    DatasetOut,
    DatasetResponse,
    DatasetRowOut,
    DatasetRowsResponse,
    FieldMappingListResponse,
    FieldMappingOut,
    FieldMappingResponse,
    ManualMappingCreateRequest,
)
from app.services.auth_service import AuthService
from app.services.dataset_service import DatasetError, DatasetService
from app.services.template_service import ManualMappingService, MappingError

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("", response_model=DatasetResponse, status_code=201)
def upload_dataset(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronous upload for MVP file sizes (see app/services/spreadsheet_service.py
    docstring -- the Background Job System is an explicitly deferred,
    later-phase concern, not something to build before there's a real
    user with a real large file).
    """
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    file_bytes = file.file.read()
    try:
        dataset = DatasetService(db).create_dataset(user.id, workspace_id, file.filename, file_bytes)
    except DatasetError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return DatasetResponse(data=DatasetOut.model_validate(dataset))


@router.get("", response_model=DatasetListResponse)
def list_datasets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace_id = AuthService(db).get_default_workspace_id(user.id)
    datasets = DatasetService(db).list_datasets(workspace_id)
    return DatasetListResponse(data=[DatasetOut.model_validate(d) for d in datasets])


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        dataset = DatasetService(db).get_dataset(dataset_id, user.id)
    except DatasetError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return DatasetResponse(data=DatasetOut.model_validate(dataset))


@router.get("/{dataset_id}/rows", response_model=DatasetRowsResponse)
def get_dataset_rows(dataset_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        rows = DatasetService(db).get_rows(dataset_id, user.id)
    except DatasetError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return DatasetRowsResponse(data=[DatasetRowOut.model_validate(r) for r in rows])


@router.post("/{dataset_id}/mappings", response_model=FieldMappingResponse, status_code=201)
def create_manual_mapping(
    dataset_id: str,
    payload: ManualMappingCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new, manually-specified field mapping for this dataset. This
    becomes the mapping used by any share created from this dataset from
    now on -- ShareService already selects the most-recently-created
    mapping, so no other wiring is needed for this to take effect.
    """
    try:
        mapping = ManualMappingService(db).create_manual_mapping(dataset_id, user.id, payload.mapping_spec)
    except MappingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return FieldMappingResponse(data=FieldMappingOut.model_validate(mapping))


@router.get("/{dataset_id}/mappings", response_model=FieldMappingListResponse)
def list_mappings(dataset_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        mappings = ManualMappingService(db).list_mappings(dataset_id, user.id)
    except MappingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return FieldMappingListResponse(data=[FieldMappingOut.model_validate(m) for m in mappings])
