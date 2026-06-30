import hashlib
from app.models.enums import CEFRLevel
from app.services.ai.base import AbstractAIProvider
from app.services.interfaces.cache import AbstractCacheService

class ErrorExplanationService:
    def __init__(self, ai_provider: AbstractAIProvider, cache_service: AbstractCacheService) -> None:
        self._ai_provider = ai_provider
        self._cache_service = cache_service

    def _generate_cache_key(self, error_text: str, correct_text: str, category: str, target_language: str, ui_language: str) -> str:
        raw_key = f"{error_text}||{correct_text}||{category}||{target_language}||{ui_language}"
        hash_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        return f"error_explanation:{hash_key}"

    async def generate_explanation(
        self,
        error_text: str,
        correct_text: str,
        category: str,
        target_language: str,
        cefr_level: CEFRLevel,
        ui_language: str
    ) -> str:
        cache_key = self._generate_cache_key(error_text, correct_text, category, target_language, ui_language)
        
        # Check distributed cache
        cached_explanation = await self._cache_service.get(cache_key)
        if cached_explanation:
            return cached_explanation

        prompt = (
            f"Explain the following language error to a student.\n"
            f"Incorrect: \"{error_text}\"\n"
            f"Correct: \"{correct_text}\"\n"
            f"Category: {category}\n"
            f"Target Language: {target_language}\n"
            f"Student CEFR Level: {cefr_level.value}\n"
            f"Explain in UI Language: {ui_language}\n\n"
            f"Please structure your explanation with three distinct parts:\n"
            f"1. What went wrong (explain the error in simple terms)\n"
            f"2. The applicable rule/pattern (explain the correct grammar rule or vocabulary pattern)\n"
            f"3. A memorable tip or mnemonic to avoid making this mistake again."
        )

        try:
            explanation = await self._ai_provider.generate_content(
                prompt=prompt,
                system_instruction="You are an expert language teacher. Write structured, encouraging, and clear explanations of errors."
            )
            explanation = explanation.strip()
            if not explanation:
                explanation = f"The correct form is: {correct_text}"
            
            # Store in distributed cache with 7-day TTL
            await self._cache_service.set(cache_key, explanation, ttl_seconds=604800)
            return explanation
        except Exception:
            return f"The correct form is: {correct_text}"
