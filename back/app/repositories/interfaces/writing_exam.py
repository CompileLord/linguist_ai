import uuid
from abc import abstractmethod
from datetime import datetime, date
from typing import Optional, List
from app.models.writing_exam import WritingExam
from app.repositories.interfaces.base import AbstractRepository

class AbstractWritingExamRepository(AbstractRepository[WritingExam, uuid.UUID]):
    @abstractmethod
    async def update_submission(
        self,
        exam_id: uuid.UUID,
        submitted_text: str,
        scores: dict,
        overall_score: float,
        feedback_text: str
    ) -> WritingExam:
        pass

    @abstractmethod
    async def get_user_history(
        self,
        user_id: uuid.UUID,
        limit: int = 10,
        offset: int = 0,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[WritingExam]:
        pass

    @abstractmethod
    async def count_daily_attempts(
        self,
        user_id: uuid.UUID,
        activity_date: date
    ) -> int:
        pass
