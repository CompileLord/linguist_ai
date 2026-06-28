import uuid
import time
import asyncio
from datetime import datetime
from typing import List, Optional
from pydantic import ValidationError
from app.models.lesson import Lesson
from app.models.language import Language
from app.models.enums import CEFRLevel
from app.schemas.lesson import LessonContent, GenerationReport, PersonalizationContext, ReadingFeedbackResponse
from app.services.interfaces.lesson import AbstractLessonGeneratorService
from app.repositories.interfaces.lesson import AbstractLessonRepository
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.services.media.tts_service import TextToSpeechService
from app.core.logging import LoggerFactory
from app.core.config import settings

logger = LoggerFactory.get_logger("LessonGenerator")

class LessonGeneratorService(AbstractLessonGeneratorService):
    def __init__(
        self,
        repository: AbstractLessonRepository,
        ai_provider: AbstractAIProvider,
        prompt_manager: PromptManager,
        tts_service: TextToSpeechService
    ) -> None:
        super().__init__(repository)
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self._tts_service = tts_service

    def _normalize_topic(self, topic: str) -> str:
        norm = topic.lower().strip()
        norm = " ".join(norm.split())
        synonyms = {
            "past simple": "simple past",
            "past tense": "simple past",
            "past simple tense": "simple past",
            "present simple": "simple present",
            "present tense": "simple present",
            "present simple tense": "simple present",
            "present perfect": "present perfect simple",
            "present perfect tense": "present perfect simple"
        }
        return synonyms.get(norm, norm)

    async def invalidate_cache(self, language_id: uuid.UUID, level: CEFRLevel, topic: str) -> bool:
        norm_topic = self._normalize_topic(topic)
        cached = await self._repository.find_cached(language_id, level, norm_topic)
        if cached:
            await self._repository.delete(cached.id)
            return True
        return False

    def _create_placeholder_content(self, failed_blocks: List[str]) -> LessonContent:
        content_dict = {
            "theory": {
                "title": "Theory Block",
                "explanation": "Content currently unavailable.",
                "key_points": [],
                "grammar_notes": ""
            },
            "examples": [],
            "vocabulary": [],
            "exercises": [],
            "test": [],
            "speaking_task": {
                "prompt": "Speaking practice prompt unavailable.",
                "expected_response_keywords": [],
                "difficulty": "A1",
                "duration_seconds": 60
            },
            "reading_text": {
                "title": "Reading Text",
                "content": "Reading content unavailable.",
                "comprehension_questions": []
            },
            "listening_script": {
                "script_text": "Listening script unavailable.",
                "questions": [],
                "audio_url": None
            }
        }
        return LessonContent.model_validate(content_dict)

    async def generate_lesson(
        self,
        language: Language,
        level: CEFRLevel,
        topic: str,
        user_goals: Optional[List[str]] = None,
        native_language_code: str = "ru"
    ) -> Lesson:
        norm_topic = self._normalize_topic(topic)
        cached = await self._repository.find_cached(language.id, level, norm_topic)
        if cached:
            age_days = (datetime.utcnow() - cached.created_at).days
            if age_days < 30:
                return cached

        goals_str = ", ".join(user_goals) if user_goals else "General English"
        lang_name_map = {"en": "English", "ru": "Russian", "tg": "Tajik"}
        explanation_lang = lang_name_map.get(native_language_code, "Russian")

        prompt = self._prompt_manager.render(
            "lessons/lesson_generation",
            language=language.name,
            level=level.value,
            topic=norm_topic,
            user_goal=goals_str,
            native_language=explanation_lang,
            previous_topics="",
            weak_areas=""
        )

        start_time = time.time()
        blocks = ["theory", "examples", "vocabulary", "exercises", "test", "speaking_task", "reading_text", "listening_script"]
        failed_blocks = []
        retry_count = 0

        content = None
        current_prompt = prompt

        for attempt in range(4):
            try:
                content = await self._ai_provider.generate_structured(
                    prompt=current_prompt,
                    response_schema=LessonContent
                )
                break
            except (ValidationError, Exception) as e:
                if attempt == 3:
                    logger.warning(f"Failed to generate lesson content after max retries: {str(e)}")
                    failed_blocks = list(blocks)
                    if isinstance(e, ValidationError):
                        failed_blocks = list({str(err["loc"][0]) for err in e.errors() if err.get("loc")})
                    content = self._create_placeholder_content(failed_blocks)
                    break
                retry_count += 1
                current_failed = list(blocks)
                if isinstance(e, ValidationError):
                    current_failed = list({str(err["loc"][0]) for err in e.errors() if err.get("loc")})
                failed_blocks = list(set(failed_blocks + current_failed))
                current_prompt = (
                    f"{prompt}\n\n"
                    f"ATTENTION: In your previous response, the following JSON blocks failed validation or were missing: "
                    f"{', '.join(current_failed)}. "
                    f"Error details: {str(e)}. "
                    f"Please regenerate the entire JSON object, making sure all fields are fully populated and correct."
                )
                await asyncio.sleep(2 ** attempt)

        duration = int((time.time() - start_time) * 1000)

        # TTS generation
        if content.listening_script and content.listening_script.script_text:
            try:
                url = await self._tts_service.synthesize_and_store(
                    text=content.listening_script.script_text,
                    language_code=language.code
                )
                content.listening_script.audio_url = url
            except Exception as e:
                logger.warning(f"Failed to generate TTS for listening script: {str(e)}")
                content.listening_script.audio_url = None

        if content.vocabulary:
            for item in content.vocabulary:
                if item.word:
                    try:
                        url = await self._tts_service.synthesize_and_store(
                            text=item.word,
                            language_code=language.code
                        )
                        item.audio_url = url
                    except Exception as e:
                        logger.warning(f"Failed to generate TTS for word '{item.word}': {str(e)}")
                        item.audio_url = None

        lesson_title = content.theory.title if content.theory else norm_topic

        # If cache stale, we can update it or delete the old one first
        if cached:
            await self._repository.delete(cached.id)

        lesson = Lesson(
            language_id=language.id,
            cefr_level=level,
            topic=norm_topic,
            title=lesson_title,
            content=content.model_dump(),
            audio_urls={
                "listening_audio": content.listening_script.audio_url if content.listening_script else None
            },
            generation_model=settings.VERTEX_AI_MODEL,
            generation_duration_ms=duration
        )
        return await self._repository.create(lesson)

    async def generate_reading_feedback(
        self,
        reading_title: str,
        reading_text: str,
        comprehension_questions: List[str],
        user_answers: List[str],
        user_level: str,
        native_language: str
    ) -> ReadingFeedbackResponse:
        prompt = self._prompt_manager.render(
            "lessons/reading_feedback",
            reading_title=reading_title,
            reading_text=reading_text,
            comprehension_questions="\n".join(
                f"{i+1}. {q}" for i, q in enumerate(comprehension_questions)
            ),
            user_answers="\n".join(
                f"{i+1}. {a}" for i, a in enumerate(user_answers)
            ),
            user_level=user_level,
            native_language=native_language
        )
        return await self._ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ReadingFeedbackResponse
        )
