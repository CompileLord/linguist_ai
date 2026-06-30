import uuid
from typing import List, Optional
from sqlalchemy import select, or_, and_
from sqlalchemy.exc import IntegrityError
from app.models.vocabulary import Vocabulary
from app.models.enums import CEFRLevel
from app.repositories.interfaces.vocabulary import AbstractVocabularyRepository

class VocabularyRepository(AbstractVocabularyRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[Vocabulary]:
        result = await self._session.execute(select(Vocabulary).filter(Vocabulary.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Vocabulary]:
        result = await self._session.execute(select(Vocabulary).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: Vocabulary) -> Vocabulary:
        existing = await self.get_by_language_and_word(model.language_id, model.word)
        if existing:
            return existing
        try:
            self._session.add(model)
            await self._session.flush()
            return model
        except IntegrityError:
            await self._session.rollback()
            existing = await self.get_by_language_and_word(model.language_id, model.word)
            if existing:
                return existing
            raise

    async def update(self, model: Vocabulary) -> Vocabulary:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        model = await self.get_by_id(id)
        if model:
            await self._session.delete(model)
            await self._session.flush()
            return True
        return False

    async def get_by_language_and_word(self, language_id: uuid.UUID, word: str) -> Optional[Vocabulary]:
        result = await self._session.execute(
            select(Vocabulary).filter(Vocabulary.language_id == language_id, Vocabulary.word == word)
        )
        return result.scalar_one_or_none()

    async def bulk_create(self, vocabulary_data: List[dict]) -> List[Vocabulary]:
        if not vocabulary_data:
            return []
        conditions = []
        for d in vocabulary_data:
            conditions.append(and_(Vocabulary.language_id == d["language_id"], Vocabulary.word == d["word"]))
        result = await self._session.execute(select(Vocabulary).filter(or_(*conditions)))
        existing_records = list(result.scalars().all())
        existing_lookup = {(r.language_id, r.word): r for r in existing_records}
        
        new_records = []
        for d in vocabulary_data:
            key = (d["language_id"], d["word"])
            if key not in existing_lookup:
                new_vocab = Vocabulary(
                    language_id=d["language_id"],
                    word=d["word"],
                    translation_context=d.get("translation_context", {}),
                    transcription=d.get("transcription"),
                    audio_url=d.get("audio_url"),
                    cefr_level=d.get("cefr_level", CEFRLevel.A1),
                    frequency_rank=d.get("frequency_rank")
                )
                self._session.add(new_vocab)
                new_records.append(new_vocab)
        
        if new_records:
            try:
                await self._session.flush()
            except IntegrityError:
                await self._session.rollback()
                result = await self._session.execute(select(Vocabulary).filter(or_(*conditions)))
                return list(result.scalars().all())
                
        return existing_records + new_records

    async def list_by_language(self, language_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[Vocabulary]:
        result = await self._session.execute(
            select(Vocabulary).filter(Vocabulary.language_id == language_id).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def list_by_cefr_level(
        self,
        language_id: uuid.UUID,
        cefr_level: CEFRLevel,
        skip: int = 0,
        limit: int = 100
    ) -> List[Vocabulary]:
        result = await self._session.execute(
            select(Vocabulary).filter(
                Vocabulary.language_id == language_id,
                Vocabulary.cefr_level == cefr_level
            ).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def search_by_prefix(self, language_id: uuid.UUID, prefix: str, limit: int = 10) -> List[Vocabulary]:
        result = await self._session.execute(
            select(Vocabulary).filter(
                Vocabulary.language_id == language_id,
                Vocabulary.word.ilike(f"{prefix}%")
            ).limit(limit)
        )
        return list(result.scalars().all())
