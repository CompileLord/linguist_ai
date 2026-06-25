import uuid
from abc import abstractmethod
from datetime import date
from typing import List, Optional
from app.models.weekly_report import WeeklyReport
from app.repositories.interfaces.base import AbstractRepository

class AbstractWeeklyReportRepository(AbstractRepository[WeeklyReport, uuid.UUID]):
    @abstractmethod
    async def get_latest(self, user_id: uuid.UUID) -> Optional[WeeklyReport]:
        pass

    @abstractmethod
    async def list_by_user(self, user_id: uuid.UUID, limit: int = 10, offset: int = 0) -> List[WeeklyReport]:
        pass

    @abstractmethod
    async def exists_for_period(self, user_id: uuid.UUID, period_start: date) -> bool:
        pass
