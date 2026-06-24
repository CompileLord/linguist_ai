import uuid
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, ConfigDict
from app.models.enums import CEFRLevel

class ListeningExamAvailableItem(BaseModel):
    exam_id: uuid.UUID
    level: CEFRLevel
    scenario_type: Optional[str]
    question_count: int

class PaginatedListeningExamAvailableResponse(BaseModel):
    items: List[ListeningExamAvailableItem]
    total: int
    page: int
    per_page: int

class ListeningQuestionClient(BaseModel):
    question_text: str
    options: List[str]

class ListeningExamDetailsResponse(BaseModel):
    id: uuid.UUID
    language_id: uuid.UUID
    level: CEFRLevel
    audio_url: Optional[str]
    questions: List[ListeningQuestionClient]

    model_config = ConfigDict(from_attributes=True)

class ListeningSubmitRequest(BaseModel):
    answers: Dict[int, int]

class ListeningQuestionResult(BaseModel):
    question_index: int
    correct: bool
    correct_answer_index: int
    explanation: str

class ListeningSubmitResponse(BaseModel):
    score: float
    results: List[ListeningQuestionResult]

class ListeningTranscriptResponse(BaseModel):
    script_text: str

class ListeningQuestionAI(BaseModel):
    question_text: str
    options: List[str]
    correct_answer_index: int
    explanation: str

class ListeningExamAI(BaseModel):
    script_text: str
    questions: List[ListeningQuestionAI]
