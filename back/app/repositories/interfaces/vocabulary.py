import uuid
from abc import abstractmethod
from typing import Optional, List
from app.models.vocabulary import Vocabulary
from app.models.enums import CEFRLevel
from app.repositories.interfaces.base import AbstractRepository

class AbstractVocabularyRepository(AbstractRepository[Vocabulary, uuid.UUID]):
    @abstractmethod
    async def get_by_language_and_word(self, language_id: uuid.UUID, word: str) -> Optional[Vocabulary]:
        pass

    @abstractmethod
    async def bulk_create(self, vocabulary_data: List[dict]) -> List[Vocabulary]:
        pass

    @abstractmethod
    async def list_by_language(self, language_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[Vocabulary]:
        pass

    @abstractmethod
    async def list_by_cefr_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel, skip: int = 0, limit: int = 100) -> List[Vocabulary]:
        pass

    @abstractmethod
    async def search_by_prefix(self, language_id: uuid.UUID, prefix: str, limit: int = 10) -> List[Vocabulary]:
        pass

    @abstractmethod
    async def count_by_language(self, language_id: uuid.UUID) -> int:
        pass

    @abstractmethod
    async def count_by_language_and_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel) -> int:
        pass
