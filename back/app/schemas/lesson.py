import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import CEFRLevel

class ExerciseType(str, Enum):
    multiple_choice = "multiple_choice"
    fill_blank = "fill_blank"
    translation = "translation"
    reorder = "reorder"

class TheoryBlock(BaseModel):
    title: str
    explanation: str
    key_points: List[str]
    grammar_notes: str

class ExampleBlock(BaseModel):
    source_text: str
    translation: str
    context: str
    difficulty: str

class VocabItem(BaseModel):
    word: str
    translation: str
    pronunciation: str
    part_of_speech: str
    example_sentence: str
    audio_url: Optional[str] = None

class ExerciseBlock(BaseModel):
    type: ExerciseType
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    hints: List[str] = []

class TestQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    points: int

class SpeakingTask(BaseModel):
    prompt: str
    expected_response_keywords: List[str]
    difficulty: str
    duration_seconds: int

class ReadingBlock(BaseModel):
    title: str
    content: str
    comprehension_questions: List[str]

class ListeningQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int

class ListeningBlock(BaseModel):
    script_text: str
    questions: List[ListeningQuestion]
    audio_url: Optional[str] = None

class LessonContent(BaseModel):
    theory: TheoryBlock
    examples: List[ExampleBlock]
    vocabulary: List[VocabItem]
    exercises: List[ExerciseBlock]
    test: List[TestQuestion]
    speaking_task: SpeakingTask
    reading_text: ReadingBlock
    listening_script: ListeningBlock

class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    language_id: uuid.UUID
    cefr_level: CEFRLevel
    topic: str
    title: str
    content: LessonContent
    audio_urls: Optional[dict] = None

class LessonRequest(BaseModel):
    topic: Optional[str] = None

class LessonProgressUpdate(BaseModel):
    status: str
    time_spent_seconds: int

class LessonCompletionRequest(BaseModel):
    exercise_answers: List[str]
    test_answers: List[int]
    time_spent_seconds: int

class LessonCompletionResponse(BaseModel):
    score: float
    xp_earned: int
    exercises_correct: int
    exercises_total: int
    accuracy: float
    level_up: bool

class LessonSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lesson_id: uuid.UUID
    title: str
    topic: str
    status: str
    score: Optional[float] = None
    xp_earned: int
    completed_at: Optional[datetime] = None

class PersonalizationContext(BaseModel):
    user_goal: Optional[str] = None
    native_language: Optional[str] = None
    previous_topics: List[str] = []
    weak_areas: List[str] = []

class GenerationReport(BaseModel):
    blocks_generated: List[str]
    blocks_failed: List[str]
    retry_count: int
    total_duration_ms: int

class ReadingFeedbackRequest(BaseModel):
    reading_title: str
    reading_text: str
    comprehension_questions: List[str]
    user_answers: List[str]
    user_level: str = "B1"
    native_language: str = "Russian"

class QuestionFeedback(BaseModel):
    question: str
    user_answer: str
    is_correct: bool
    feedback_text: str
    correct_example: str

class ReadingFeedbackResponse(BaseModel):
    feedback: List[QuestionFeedback]

class TtsRequest(BaseModel):
    text: str
    language_code: str = "en"

class TtsResponse(BaseModel):
    audio_url: Optional[str] = None
