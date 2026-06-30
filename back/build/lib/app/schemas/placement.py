import uuid
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import CEFRLevel

class PlacementQuestion(BaseModel):
    question_text: str
    options: List[str]
    correct_answer_index: int
    difficulty_level: CEFRLevel
    explanation: str

class PlacementStepResult(BaseModel):
    is_correct: bool
    explanation: str
    next_question: Optional[PlacementQuestion] = None
    current_estimate: CEFRLevel

class PlacementResult(BaseModel):
    final_level: CEFRLevel
    score: float
    questions_answered: int
    correct_count: int
    accuracy: float
    level_description: str
    recommended_starting_topics: List[str]

class PlacementAnswerRequest(BaseModel):
    answer_index: int
