import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class TutorSessionCreate(BaseModel):
    title: str
    active_lesson_id: Optional[uuid.UUID] = None
    topic_context: Optional[Dict[str, Any]] = None

class TutorSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    topic_context: Optional[Dict[str, Any]] = None
    active_lesson_id: Optional[uuid.UUID] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool
    message_count: int

    model_config = ConfigDict(from_attributes=True)

class TutorMessageCreate(BaseModel):
    content: str

class TutorMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    token_count: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RateLimitStatus(BaseModel):
    allowed: bool
    remaining: int
    reset_at: datetime

class CorrectionRequest(BaseModel):
    text: str
    target_language: Optional[str] = "English"

class CorrectionIssue(BaseModel):
    original: str
    corrected: str
    explanation: str
    type: str  # grammar | spelling | word_choice | fluency

class CorrectionResponse(BaseModel):
    original_text: str
    corrected_text: str
    is_correct: bool
    overall_feedback: str
    issues: list[CorrectionIssue]
    fluency_score: int  # 1-10
