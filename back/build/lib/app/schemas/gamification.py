from pydantic import BaseModel
from typing import Optional
from datetime import date

class GamificationStatsResponse(BaseModel):
    total_xp: int
    current_game_level: int
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    xp_for_next_level: int
    xp_remaining_for_next_level: int
    level_progress_percentage: float
    has_unread_report: bool

class RecordActivityRequest(BaseModel):
    action_type: str
    score: Optional[float] = None
