import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    code: str
    title: str
    description: str
    condition_type: str
    condition_value: int
    is_unlocked: bool

class UserAchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    achievement_id: uuid.UUID
    code: str
    title: str
    description: str
    unlocked_at: datetime
