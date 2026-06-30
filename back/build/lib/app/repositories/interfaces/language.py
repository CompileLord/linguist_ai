import uuid
from abc import abstractmethod
from typing import Optional, List
from app.models.language import Language
from app.repositories.interfaces.base import AbstractRepository

class AbstractLanguageRepository(AbstractRepository[Language, uuid.UUID]):
    @abstractmethod
    async def get_by_code(self, code: str) -> Optional[Language]:
        pass

    @abstractmethod
    async def get_active_languages(self) -> List[Language]:
        pass

    @abstractmethod
    async def exists_by_code(self, code: str) -> bool:
        pass
