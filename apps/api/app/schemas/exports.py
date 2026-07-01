from typing import Literal

from pydantic import BaseModel


class ExportRequest(BaseModel):
    format: Literal["csv", "png", "pdf"]
