import uuid
from abc import abstractmethod
from typing import List, Optional
from app.models.lesson import Lesson
from app.models.user_lesson import UserLesson
from app.models.language import Language
from app.models.enums import CEFRLevel
from app.schemas.lesson import LessonContent, LessonResponse, LessonCompletionRequest, LessonCompletionResponse
from app.services.interfaces.base import AbstractService
from app.repositories.interfaces.lesson import AbstractLessonRepository

class AbstractLessonGeneratorService(AbstractService[AbstractLessonRepository]):
    @abstractmethod
    async def generate_lesson(
        self,
        language: Language,
        level: CEFRLevel,
        topic: str,
        user_goals: Optional[List[str]] = None,
        native_language_code: str = "ru"
    ) -> Lesson:
        pass

    @abstractmethod
    async def invalidate_cache(self, language_id: uuid.UUID, level: CEFRLevel, topic: str) -> bool:
        pass
