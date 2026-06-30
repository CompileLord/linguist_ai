import uuid
from abc import abstractmethod
from datetime import date
from typing import List, Optional
from app.models.listening_exam import ListeningExam
from app.models.user_listening_attempt import UserListeningAttempt
from app.models.enums import CEFRLevel
from app.repositories.interfaces.base import AbstractRepository

class AbstractListeningExamRepository(AbstractRepository[ListeningExam, uuid.UUID]):
    @abstractmethod
    async def get_available_exams(
        self,
        user_id: uuid.UUID,
        language_id: uuid.UUID,
        level: CEFRLevel,
        skip: int = 0,
        limit: int = 100
    ) -> List[ListeningExam]:
        pass

    @abstractmethod
    async def create_attempt(
        self,
        model: UserListeningAttempt
    ) -> UserListeningAttempt:
        pass

    @abstractmethod
    async def has_user_completed(
        self,
        user_id: uuid.UUID,
        exam_id: uuid.UUID
    ) -> bool:
        pass

    @abstractmethod
    async def count_daily_attempts(
        self,
        user_id: uuid.UUID,
        activity_date: date
    ) -> int:
        pass

    @abstractmethod
    async def get_attempt_history(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserListeningAttempt]:
        pass
