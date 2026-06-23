from typing import List
from app.models.language import Language
from app.schemas.language import LanguageResponse
from app.services.interfaces.language import AbstractLanguageService
from app.core.exceptions import NotFoundException, ValidationException

class LanguageService(AbstractLanguageService):
    async def get_all_active(self) -> List[LanguageResponse]:
        languages = await self._repository.get_active_languages()
        return [LanguageResponse.model_validate(lang) for lang in languages]

    async def get_by_code(self, code: str) -> LanguageResponse:
        lang = await self._repository.get_by_code(code)
        if not lang or not lang.is_active:
            raise NotFoundException(f"Language with code {code} not found or inactive")
        return LanguageResponse.model_validate(lang)

    async def validate_language_code(self, code: str) -> Language:
        lang = await self._repository.get_by_code(code)
        if not lang or not lang.is_active:
            raise ValidationException(f"Invalid or inactive language code: {code}")
        return lang
