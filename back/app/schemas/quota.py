from pydantic import BaseModel
from typing import List

class QuotaStatusItem(BaseModel):
    function_name: str
    daily_limit: int
    current_usage: int
    remaining: int
    reset_at: str

class UserQuotaStatusResponse(BaseModel):
    quotas: List[QuotaStatusItem]
