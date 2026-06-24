import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class WritingPromptResponse(BaseModel):
    exam_id: uuid.UUID
    prompt_text: str
    recommended_word_count: int
    suggested_time_minutes: int

class WritingExamPromptGenerateAI(BaseModel):
    prompt_text: str
    recommended_word_count: int
    suggested_time_minutes: int

class WritingFeedbackItem(BaseModel):
    criterion: str
    issue: str
    recommendation: str
    corrected_example: str

class WritingEvaluationAI(BaseModel):
    grammar_score: float = Field(..., ge=0, le=100)
    vocabulary_score: float = Field(..., ge=0, le=100)
    cohesion_score: float = Field(..., ge=0, le=100)
    naturalness_score: float = Field(..., ge=0, le=100)
    style_score: float = Field(..., ge=0, le=100)
    overall_score: float = Field(..., ge=0, le=100)
    feedback_items: List[WritingFeedbackItem]

class WritingExamSubmitRequest(BaseModel):
    exam_id: uuid.UUID
    submitted_text: str

class WritingEvaluationResponse(BaseModel):
    id: uuid.UUID
    prompt: str
    submitted_text: str
    scores: dict
    overall_score: float
    feedback_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WritingExamHistoryItem(BaseModel):
    exam_id: uuid.UUID
    prompt_snippet: str
    overall_score: Optional[float]
    created_at: datetime

class PaginatedWritingExamHistoryResponse(BaseModel):
    items: List[WritingExamHistoryItem]
    total: int
    page: int
    per_page: int
