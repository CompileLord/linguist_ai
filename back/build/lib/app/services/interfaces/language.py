from abc import abstractmethod
from typing import List
from app.models.language import Language
from app.schemas.language import LanguageResponse
from app.services.interfaces.base import AbstractService
from app.repositories.interfaces.language import AbstractLanguageRepository

class AbstractLanguageService(AbstractService[AbstractLanguageRepository]):
    @abstractmethod
    async def get_all_active(self) -> List[LanguageResponse]:
        pass

    @abstractmethod
    async def get_by_code(self, code: str) -> LanguageResponse:
        pass

    @abstractmethod
    async def validate_language_code(self, code: str) -> Language:
        pass
