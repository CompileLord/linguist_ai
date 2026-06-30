from typing import List
from pydantic import BaseModel

class WordInfo(BaseModel):
    word: str
    start_time: float
    end_time: float

class TranscriptionResult(BaseModel):
    transcript: str
    confidence: float
    word_timestamps: List[WordInfo]
