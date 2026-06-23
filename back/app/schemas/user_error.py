import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import ErrorCategory

class DetectedError(BaseModel):
    error_text: str
    correct_text: str
    category: ErrorCategory
    explanation: str

class ErrorDetectionResult(BaseModel):
    errors: List[DetectedError]

class UserErrorResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: ErrorCategory
    error_text: str
    correct_text: str
    explanation: str
    related_lesson_id: Optional[uuid.UUID] = None
    occurrence_count: int
    last_occurred_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ErrorSummaryResponse(BaseModel):
    total_errors: int
    grammar_errors: int
    vocabulary_errors: int
    most_common_error_text: Optional[str] = None

class PaginatedUserErrorResponse(BaseModel):
    items: List[UserErrorResponse]
    total: int
    page: int
    per_page: int
