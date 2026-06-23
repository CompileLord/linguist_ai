import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, conint
from app.models.enums import CEFRLevel

class ReviewOutcome(BaseModel):
    quality: int = Field(..., ge=0, le=5)
    response_time_ms: Optional[int] = Field(None, ge=0)

class VocabularyCreate(BaseModel):
    language_id: uuid.UUID
    word: str = Field(..., min_length=1, max_length=255)
    translation_context: Dict[str, Any]
    transcription: Optional[str] = Field(None, max_length=255)
    cefr_level: CEFRLevel = CEFRLevel.A1
    frequency_rank: Optional[int] = None

class VocabularyResponse(BaseModel):
    id: uuid.UUID
    language_id: uuid.UUID
    word: str
    translation_context: Dict[str, Any]
    transcription: Optional[str]
    audio_url: Optional[str]
    cefr_level: CEFRLevel
    frequency_rank: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserVocabularyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    vocabulary_id: uuid.UUID
    is_known: bool
    repetitions_count: int
    errors_count: int
    last_reviewed_at: Optional[datetime]
    created_at: datetime
    vocabulary: Optional[VocabularyResponse] = None

    class Config:
        from_attributes = True

class PaginatedVocabularyResponse(BaseModel):
    items: List[VocabularyResponse]
    total: int
    page: int
    per_page: int

class PaginatedUserVocabularyResponse(BaseModel):
    items: List[UserVocabularyResponse]
    total: int
    page: int
    per_page: int

class ExtractedWord(BaseModel):
    word: str
    translation: str
    context_sentence: str
    transcription: Optional[str] = None
    part_of_speech: str

class ExtractedVocabularyResponse(BaseModel):
    words: List[ExtractedWord]

