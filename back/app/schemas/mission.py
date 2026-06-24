import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class MissionResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    scenario_prompt: str
    related_goal: str
    cefr_level_min: str
    estimated_duration_minutes: int
    difficulty_rating: int
    is_active: bool
    completed_before: bool = False
    best_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class UserMissionAttemptResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    mission_id: uuid.UUID
    transcript: List[Dict[str, Any]]
    feedback: Optional[str] = None
    score: Optional[float] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MissionFeedback(BaseModel):
    task_completion_score: float
    accuracy_score: float
    vocabulary_score: float
    fluency_score: float
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    improvement_suggestions: List[str]
    score: Optional[float] = None
