from typing import List
from app.models.enums import CEFRLevel
from app.schemas.user_error import ErrorDetectionResult, DetectedError
from app.services.ai.base import AbstractAIProvider

class ErrorDetectionService:
    def __init__(self, ai_provider: AbstractAIProvider) -> None:
        self._ai_provider = ai_provider

    async def detect_errors(
        self,
        user_text: str,
        context_type: str,
        target_language: str,
        cefr_level: CEFRLevel
    ) -> List[DetectedError]:
        prompt = (
            f"Analyze the following user response for grammatical and vocabulary errors.\n"
            f"User Text: \"{user_text}\"\n"
            f"Context/Exercise Type: {context_type}\n"
            f"Target Language: {target_language}\n"
            f"User CEFR Level: {cefr_level.value}\n\n"
            f"Instructions:\n"
            f"Identify errors that impede clear communication or violate standard grammar rules for this level.\n"
            f"Be lenient. If the user is at a lower level (A1-A2), do not flag advanced structural issues; only flag basic errors.\n"
            f"Return a list of errors. For each, specify: \n"
            f"1. The exact erroneous substring (error_text)\n"
            f"2. The correct text replacement (correct_text)\n"
            f"3. The error category (grammar or vocabulary)\n"
            f"4. A simple explanation suitable for a {cefr_level.value} level student."
        )

        system_instruction = "You are a friendly language tutor analyzing student text for errors. Be supportive and construct a structured error report."
        
        result = await self._ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ErrorDetectionResult,
            system_instruction=system_instruction
        )
        return result.errors
