import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.enums import SpacedRepetitionItemType
from app.schemas.vocabulary import VocabularyResponse

class ReviewResponse(BaseModel):
    quality: int = Field(..., ge=0, le=5)
    response_time_ms: Optional[int] = Field(None, ge=0)

class SpacedRepetitionItemResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    item_type: SpacedRepetitionItemType
    item_id: uuid.UUID
    learned_at: datetime
    last_reviewed_at: Optional[datetime]
    next_review_at: datetime
    interval_days: float
    repetition_number: int
    ease_factor: float
    mastery_percent: float
    detail: Optional[VocabularyResponse] = None

    class Config:
        from_attributes = True

class DailyCountResponse(BaseModel):
    date: str
    count: int

class ReviewStatsResponse(BaseModel):
    total_due_today: int
    completed_today: int
    streak_days: int
    daily_counts: List[DailyCountResponse]
    mastery_distribution: Dict[str, int]
