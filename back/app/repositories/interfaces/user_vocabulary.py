import uuid
from abc import abstractmethod
from typing import Optional, List
from app.models.user_vocabulary import UserVocabulary
from app.repositories.interfaces.base import AbstractRepository

class AbstractUserVocabularyRepository(AbstractRepository[UserVocabulary, uuid.UUID]):
    @abstractmethod
    async def get_by_user_and_vocab(self, user_id: uuid.UUID, vocabulary_id: uuid.UUID) -> Optional[UserVocabulary]:
        pass

    @abstractmethod
    async def list_by_user(
        self,
        user_id: uuid.UUID,
        is_known: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None
    ) -> List[UserVocabulary]:
        pass
