import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class AICoachReportAI(BaseModel):
    strengths: str
    weaknesses: str
    recommendations: str

class WeeklyReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    period_start: date
    period_end: date
    strengths: str
    weaknesses: str
    recommendations: str
    generated_at: datetime

class WeeklyReportHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    period_start: date
    period_end: date
    generated_at: datetime
    strengths_preview: str

class PaginatedWeeklyReportResponse(BaseModel):
    items: list[WeeklyReportHistoryItem]
    total: int
    page: int
    per_page: int
