import uuid
from abc import abstractmethod
from typing import Optional, List
from app.models.lesson import Lesson
from app.models.user_lesson import UserLesson
from app.models.enums import CEFRLevel
from app.repositories.interfaces.base import AbstractRepository

class AbstractLessonRepository(AbstractRepository[Lesson, uuid.UUID]):
    @abstractmethod
    async def find_cached(self, language_id: uuid.UUID, cefr_level: CEFRLevel, topic: str) -> Optional[Lesson]:
        pass

    @abstractmethod
    async def get_by_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel, limit: int = 100, offset: int = 0) -> List[Lesson]:
        pass

    @abstractmethod
    async def count_by_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel) -> int:
        pass

class AbstractUserLessonRepository(AbstractRepository[UserLesson, uuid.UUID]):
    @abstractmethod
    async def get_user_lesson(self, user_id: uuid.UUID, lesson_id: uuid.UUID) -> Optional[UserLesson]:
        pass

    @abstractmethod
    async def get_user_history(self, user_id: uuid.UUID, status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[UserLesson]:
        pass

    @abstractmethod
    async def get_next_incomplete(self, user_id: uuid.UUID) -> Optional[UserLesson]:
        pass

    @abstractmethod
    async def update_progress(self, user_lesson_id: uuid.UUID, updates: dict) -> UserLesson:
        pass
