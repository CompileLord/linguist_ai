import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LanguageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    native_name: Optional[str] = None
    icon_url: Optional[str] = None
