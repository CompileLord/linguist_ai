import uuid
from typing import List, Set
from app.models.user_profile import UserProfile
from app.schemas.vocabulary import ExtractedVocabularyResponse, VocabularyCreate
from app.services.vocabulary_service import VocabularyService
from app.repositories.user_vocabulary_repository import UserVocabularyRepository
from app.services.ai.base import AbstractAIProvider
from app.core.logging import LoggerFactory

logger = LoggerFactory.get_logger("VocabularyExtractionService")

class VocabularyExtractionService:
    def __init__(
        self,
        vocabulary_service: VocabularyService,
        user_vocabulary_repo: UserVocabularyRepository,
        ai_provider: AbstractAIProvider
    ) -> None:
        self._vocabulary_service = vocabulary_service
        self._user_vocabulary_repo = user_vocabulary_repo
        self._ai_provider = ai_provider

    async def extract_and_add_vocabulary(
        self,
        user_id: uuid.UUID,
        lesson_text: str,
        profile: UserProfile,
        target_language_name: str
    ) -> None:
        try:
            from app.models.enums import CEFRLevel
            level = profile.current_level or CEFRLevel.A1
            prompt = (
                f"Identify and extract key vocabulary words from the following lesson content that are appropriate for a {level.value} level student.\n"
                f"Lesson Content:\n\"\"\"\n{lesson_text}\n\"\"\"\n\n"
                f"Target Language: {target_language_name}\n"
                f"Explain and translate into the user's native language: {profile.native_language_code}\n"
                f"For each word, provide:\n"
                f"1. The word in the target language (word)\n"
                f"2. The translation (translation)\n"
                f"3. A contextual example sentence from the text or a simple new one (context_sentence)\n"
                f"4. A phonetic transcription if helpful (transcription)\n"
                f"5. The part of speech (part_of_speech)"
            )

            result = await self._ai_provider.generate_structured(
                prompt=prompt,
                response_schema=ExtractedVocabularyResponse,
                system_instruction="You are a helpful curriculum assistant extracting vocabulary list from a lesson. Extract only genuinely useful terms."
            )

            from sqlalchemy import select
            from app.models.vocabulary import Vocabulary
            from app.models.user_vocabulary import UserVocabulary
            from app.core.database import db_manager

            async with db_manager.get_session() as session:
                db_res = await session.execute(
                    select(Vocabulary.word)
                    .join(UserVocabulary, UserVocabulary.vocabulary_id == Vocabulary.id)
                    .filter(UserVocabulary.user_id == user_id)
                )
                existing_words = {w[0].strip().lower() for w in db_res.all() if w[0]}


            for item in result.words:
                word_clean = item.word.strip()
                if word_clean.lower() not in existing_words:
                    vocab_in = VocabularyCreate(
                        language_id=profile.target_language_id,
                        word=word_clean,
                        translation_context={
                            profile.native_language_code: {
                                "translation": item.translation,
                                "example": item.context_sentence,
                                "part_of_speech": item.part_of_speech
                            }
                        },
                        transcription=item.transcription,
                        cefr_level=level
                    )
                    await self._vocabulary_service.add_word_for_user(user_id, vocab_in)

        except Exception as e:
            logger.error(f"Failed to extract vocabulary from lesson: {str(e)}")
