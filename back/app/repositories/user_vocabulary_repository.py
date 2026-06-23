import uuid
from typing import List, Optional
from sqlalchemy import select
from app.models.user_vocabulary import UserVocabulary
from app.repositories.interfaces.user_vocabulary import AbstractUserVocabularyRepository

class UserVocabularyRepository(AbstractUserVocabularyRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserVocabulary]:
        result = await self._session.execute(select(UserVocabulary).filter(UserVocabulary.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserVocabulary]:
        result = await self._session.execute(select(UserVocabulary).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: UserVocabulary) -> UserVocabulary:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserVocabulary) -> UserVocabulary:
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

    async def get_by_user_and_vocab(self, user_id: uuid.UUID, vocabulary_id: uuid.UUID) -> Optional[UserVocabulary]:
        result = await self._session.execute(
            select(UserVocabulary).filter(
                UserVocabulary.user_id == user_id,
                UserVocabulary.vocabulary_id == vocabulary_id
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        is_known: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None
    ) -> List[UserVocabulary]:
        query = select(UserVocabulary).filter(UserVocabulary.user_id == user_id)
        if is_known is not None:
            query = query.filter(UserVocabulary.is_known == is_known)
        
        if sort_by == "last_reviewed_at":
            query = query.order_by(UserVocabulary.last_reviewed_at.desc())
        elif sort_by == "errors_count":
            query = query.order_by(UserVocabulary.errors_count.desc())
        elif sort_by == "repetitions_count":
            query = query.order_by(UserVocabulary.repetitions_count.desc())
            
        query = query.offset(skip).limit(limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())
