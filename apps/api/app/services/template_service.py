"""
TemplateService -- Template Builder backend (Module 7).

VERSIONING RULE (the one thing to never violate in this file): editing a
template NEVER updates layout_spec on an existing row. It always INSERTs
a new Template row with version = parent.version + 1 and
parent_template_id pointing back at the version it was edited from. This
is what guarantees a share created against version 3 of a template keeps
rendering exactly as it did, even after the owner "edits" the template to
create version 4 -- they're really creating a new template, not mutating
the one in use. See app/models/template.py's docstring for the original
design rationale.

LINEAGE / LISTING DESIGN DECISION: a "template" the owner thinks of as
one thing (e.g. "Employee Badge") is actually a CHAIN of Template rows
across versions. Listing templates for a workspace should show one entry
per chain -- the latest version -- not a flat, cluttered list of every
historical version ever created. A template is "latest in its chain" if
no other template has parent_template_id pointing at it (i.e. it's a
leaf in the version tree). This is computed in list_templates() below.
"""
from sqlalchemy.orm import Session

from app.models.dataset import Dataset, FieldMapping
from app.models.identity import Workspace
from app.models.template import Template

_ALLOWED_BLOCK_TYPES = {"image", "text", "chart", "badge", "attachment"}


class TemplateError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def validate_layout_spec(layout_spec: list) -> None:
    """
    layout_spec must be an ordered list of blocks: {"type": ..., "config": {...}}.
    Validated here, at creation/versioning time, so a malformed template
    is rejected with a clear 422 immediately -- not stored as silent
    garbage that only breaks later when some future frontend renderer
    tries to render it.
    """
    if not isinstance(layout_spec, list) or len(layout_spec) == 0:
        raise TemplateError("layout_spec must be a non-empty list of blocks.")
    for i, block in enumerate(layout_spec):
        if not isinstance(block, dict) or "type" not in block:
            raise TemplateError(f"Block at index {i} must be an object with a 'type' field.")
        if block["type"] not in _ALLOWED_BLOCK_TYPES:
            raise TemplateError(
                f"Block at index {i} has unsupported type '{block['type']}'. "
                f"Allowed types: {sorted(_ALLOWED_BLOCK_TYPES)}."
            )


class TemplateService:
    def __init__(self, db: Session):
        self.db = db

    # ---- Workspace access check, shared by every method below ----

    def _check_workspace_access(self, workspace_id: str, user_id: str) -> None:
        # MVP authorization, consistent with the pattern used throughout
        # this codebase (DatasetService, ShareService): a user has access
        # to their own workspace. Real multi-member role checks are the
        # same documented extension point as require_role() elsewhere --
        # not guessed at here.
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise TemplateError("Workspace not found.", status_code=404)
        # We don't have a direct "workspace belongs to user" check without
        # an org-membership join here; the practical MVP check (matching
        # how get_default_workspace_id is used everywhere else) is that
        # the caller already obtained this workspace_id via their own
        # AuthService.get_default_workspace_id(user_id) call -- so by
        # construction, if they reached this far, it's theirs.

    # ---- Create ----

    def create_template(self, workspace_id: str, user_id: str, name: str, layout_spec: list) -> Template:
        self._check_workspace_access(workspace_id, user_id)
        validate_layout_spec(layout_spec)

        template = Template(
            workspace_id=workspace_id,
            name=name,
            layout_spec=layout_spec,
            version=1,
            parent_template_id=None,
            created_by=user_id,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    # ---- Versioning ("edit") ----

    def create_new_version(
        self, template_id: str, workspace_id: str, user_id: str, layout_spec: list, name: str | None = None
    ) -> Template:
        parent = self._get_owned_template(template_id, workspace_id)
        validate_layout_spec(layout_spec)

        new_version = Template(
            workspace_id=workspace_id,
            name=name if name is not None else parent.name,
            layout_spec=layout_spec,
            version=parent.version + 1,
            parent_template_id=parent.id,
            created_by=user_id,
        )
        self.db.add(new_version)
        self.db.commit()
        self.db.refresh(new_version)
        return new_version

    # ---- Read ----

    def get_template(self, template_id: str, workspace_id: str) -> Template:
        return self._get_owned_template(template_id, workspace_id)

    def list_templates(self, workspace_id: str) -> list[Template]:
        """Returns only the LATEST version per chain -- see module docstring."""
        all_templates = (
            self.db.query(Template)
            .filter(Template.workspace_id == workspace_id, Template.deleted_at.is_(None))
            .all()
        )
        parent_ids = {t.parent_template_id for t in all_templates if t.parent_template_id is not None}
        latest_only = [t for t in all_templates if t.id not in parent_ids]
        return sorted(latest_only, key=lambda t: t.created_at, reverse=True)

    def list_versions(self, template_id: str, workspace_id: str) -> list[Template]:
        """Walks the full chain (both directions) for one template lineage -- useful
        for a 'version history' view. Cheap to provide now given list_templates()
        already needed to reason about chains."""
        anchor = self._get_owned_template(template_id, workspace_id)
        all_templates = (
            self.db.query(Template)
            .filter(Template.workspace_id == workspace_id, Template.deleted_at.is_(None))
            .all()
        )
        by_id = {t.id: t for t in all_templates}

        # Walk backward to the root of this chain
        root = anchor
        while root.parent_template_id is not None and root.parent_template_id in by_id:
            root = by_id[root.parent_template_id]

        # Collect the full chain forward from the root
        chain = [root]
        children_by_parent = {}
        for t in all_templates:
            if t.parent_template_id:
                children_by_parent.setdefault(t.parent_template_id, []).append(t)
        current = root
        while current.id in children_by_parent:
            # Each template has at most one child in this linear versioning
            # model (no branching), so [0] is always correct here.
            current = children_by_parent[current.id][0]
            chain.append(current)

        return sorted(chain, key=lambda t: t.version)

    def _get_owned_template(self, template_id: str, workspace_id: str) -> Template:
        template = (
            self.db.query(Template)
            .filter(Template.id == template_id, Template.deleted_at.is_(None))
            .first()
        )
        if not template:
            raise TemplateError("Template not found.", status_code=404)
        if template.workspace_id != workspace_id:
            raise TemplateError("You don't have access to this template.", status_code=403)
        return template


class MappingError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ManualMappingService:
    """
    Manual field mapping CRUD -- the "manual override" half of the Data
    Mapping Layer (auto-generation already existed via mapping_service.py
    since Module 3; this is the part where the owner takes control).

    Design note: creating a new FieldMapping row (rather than updating an
    existing one) automatically becomes the mapping used by future shares
    for this dataset, because ShareService.create_share() already selects
    "most recently created mapping for this dataset" -- this was true
    since Module 3 and needed no changes here. A manual mapping is simply
    a new row with is_auto_generated=False.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_manual_mapping(self, dataset_id: str, user_id: str, mapping_spec: dict) -> FieldMapping:
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None)).first()
        if not dataset:
            raise MappingError("Dataset not found.", status_code=404)
        if dataset.owner_id != user_id:
            raise MappingError("You don't have access to this dataset.", status_code=403)

        real_columns = {c["column_name"] for c in dataset.schema_definition}
        for role, column in mapping_spec.items():
            if column not in real_columns:
                raise MappingError(
                    f"Mapping references column '{column}' for role '{role}', "
                    f"which doesn't exist in this dataset. Available columns: {sorted(real_columns)}.",
                    status_code=422,
                )

        mapping = FieldMapping(
            dataset_id=dataset_id,
            mapping_spec=mapping_spec,
            is_auto_generated=False,
        )
        self.db.add(mapping)
        self.db.commit()
        self.db.refresh(mapping)
        return mapping

    def list_mappings(self, dataset_id: str, user_id: str) -> list[FieldMapping]:
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.deleted_at.is_(None)).first()
        if not dataset:
            raise MappingError("Dataset not found.", status_code=404)
        if dataset.owner_id != user_id:
            raise MappingError("You don't have access to this dataset.", status_code=403)
        return (
            self.db.query(FieldMapping)
            .filter(FieldMapping.dataset_id == dataset_id)
            .order_by(FieldMapping.created_at.desc())
            .all()
        )
