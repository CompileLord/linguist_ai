import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import CEFRLevel

class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_type: str
    is_primary: bool
    priority_order: int

class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    target_language_code: str
    native_language_code: str
    current_level: Optional[CEFRLevel] = None
    placement_score: Optional[float] = None
    daily_goal_minutes: int
    streak_count: int
    total_xp: int
    onboarding_completed: bool
    goals: List[GoalResponse] = []

class ProfileSetupRequest(BaseModel):
    target_language_code: str
    native_language_code: str
    daily_goal_minutes: int = 15
    goals: List[str]

class GoalsUpdateRequest(BaseModel):
    goals: List[str]
