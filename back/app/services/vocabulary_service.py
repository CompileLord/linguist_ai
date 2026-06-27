import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from app.models.vocabulary import Vocabulary
from app.models.user_vocabulary import UserVocabulary
from app.models.language import Language
from app.schemas.vocabulary import VocabularyCreate, ReviewOutcome
from app.core.exceptions import VocabularyNotFoundError, DuplicateVocabularyError
from app.repositories.vocabulary_repository import VocabularyRepository
from app.repositories.user_vocabulary_repository import UserVocabularyRepository
from app.repositories.language_repository import LanguageRepository
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.services.media.tts_service import TextToSpeechService
from app.core.database import db_manager
from app.models.enums import SpacedRepetitionItemType
from app.models.spaced_repetition_item import SpacedRepetitionItem

class VocabularyService:
    def __init__(
        self,
        vocabulary_repo: VocabularyRepository,
        user_vocabulary_repo: UserVocabularyRepository,
        language_repo: LanguageRepository,
        tts_service: TextToSpeechService,
        spaced_repetition_repo: Optional[SpacedRepetitionRepository] = None
    ) -> None:
        self._vocabulary_repo = vocabulary_repo
        self._user_vocabulary_repo = user_vocabulary_repo
        self._language_repo = language_repo
        self._tts_service = tts_service
        self._spaced_repetition_repo = spaced_repetition_repo

    async def add_word_for_user(self, user_id: uuid.UUID, vocab_in: VocabularyCreate) -> UserVocabulary:
        language = await self._language_repo.get_by_id(vocab_in.language_id)
        if not language:
            raise VocabularyNotFoundError(f"Language {vocab_in.language_id} not found")

        vocab = await self._vocabulary_repo.get_by_language_and_word(vocab_in.language_id, vocab_in.word)
        if not vocab:
            vocab = Vocabulary(
                language_id=vocab_in.language_id,
                word=vocab_in.word,
                translation_context=vocab_in.translation_context,
                transcription=vocab_in.transcription,
                cefr_level=vocab_in.cefr_level,
                frequency_rank=vocab_in.frequency_rank
            )
            vocab = await self._vocabulary_repo.create(vocab)

        if not vocab.audio_url:
            asyncio.create_task(self._generate_tts_background(vocab.id, vocab.word, language.code))

        user_vocab = await self._user_vocabulary_repo.get_by_user_and_vocab(user_id, vocab.id)
        if not user_vocab:
            user_vocab = UserVocabulary(
                user_id=user_id,
                vocabulary_id=vocab.id,
                is_known=False
            )
            user_vocab = await self._user_vocabulary_repo.create(user_vocab)

        if self._spaced_repetition_repo:
            sr_item = await self._spaced_repetition_repo.get_by_user_and_item(
                user_id=user_id,
                item_type=SpacedRepetitionItemType.VOCAB,
                item_id=vocab.id
            )
            if not sr_item:
                sr_item = SpacedRepetitionItem(
                    user_id=user_id,
                    item_type=SpacedRepetitionItemType.VOCAB,
                    item_id=vocab.id,
                    next_review_at=datetime.utcnow(),
                    interval_days=1.0,
                    ease_factor=2.5,
                    mastery_percent=0.0
                )
                await self._spaced_repetition_repo.create(sr_item)


        user_vocab.vocabulary = vocab
        return user_vocab

    async def _generate_tts_background(self, vocab_id: uuid.UUID, word: str, language_code: str) -> None:
        try:
            url = await self._tts_service.synthesize_and_store(word, language_code)
            if url:
                await asyncio.sleep(0.5)
                async with db_manager.get_session() as session:
                    result = await session.execute(select(Vocabulary).filter(Vocabulary.id == vocab_id))
                    v = result.scalar_one_or_none()
                    if v:
                        v.audio_url = url
                        session.add(v)
                        await session.commit()
        except Exception:
            pass

    async def ensure_audio(self, vocabulary_id: uuid.UUID) -> Optional[str]:
        vocab = await self._vocabulary_repo.get_by_id(vocabulary_id)
        if not vocab:
            raise VocabularyNotFoundError(f"Vocabulary {vocabulary_id} not found")
        if vocab.audio_url:
            return vocab.audio_url
        language = await self._language_repo.get_by_id(vocab.language_id)
        lang_code = language.code if language else "en"
        url = await self._tts_service.synthesize_and_store(vocab.word, lang_code)
        if url:
            vocab.audio_url = url
            await self._vocabulary_repo.update(vocab)
        return vocab.audio_url

    async def record_review(self, user_id: uuid.UUID, vocabulary_id: uuid.UUID, outcome: ReviewOutcome) -> UserVocabulary:
        user_vocab = await self._user_vocabulary_repo.get_by_user_and_vocab(user_id, vocabulary_id)
        if not user_vocab:
            raise VocabularyNotFoundError("Vocabulary association not found for this user")

        user_vocab.repetitions_count += 1
        if outcome.quality < 3:
            user_vocab.errors_count += 1
        
        user_vocab.is_known = outcome.quality >= 3
        user_vocab.last_reviewed_at = datetime.utcnow()
        
        await self._user_vocabulary_repo.update(user_vocab)
        
        vocab = await self._vocabulary_repo.get_by_id(vocabulary_id)
        user_vocab.vocabulary = vocab
        return user_vocab

    async def get_user_vocabulary(
        self,
        user_id: uuid.UUID,
        is_known: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None
    ) -> Tuple[List[UserVocabulary], int]:
        items = await self._user_vocabulary_repo.list_by_user(
            user_id=user_id,
            is_known=is_known,
            skip=skip,
            limit=limit,
            sort_by=sort_by
        )
        
        async with db_manager.get_session() as session:
            query = select(func.count(UserVocabulary.id)).filter(UserVocabulary.user_id == user_id)
            if is_known is not None:
                query = query.filter(UserVocabulary.is_known == is_known)
            result = await session.execute(query)
            total = result.scalar() or 0

        for item in items:
            item.vocabulary = await self._vocabulary_repo.get_by_id(item.vocabulary_id)

        return items, total
