import uuid
from abc import abstractmethod
from typing import Optional
from app.models.user_profile import UserProfile
from app.models.enums import CEFRLevel
from app.repositories.interfaces.base import AbstractRepository

class AbstractProfileRepository(AbstractRepository[UserProfile, uuid.UUID]):
    @abstractmethod
    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[UserProfile]:
        pass

    @abstractmethod
    async def exists_for_user(self, user_id: uuid.UUID) -> bool:
        pass

    @abstractmethod
    async def update_level(self, user_id: uuid.UUID, level: CEFRLevel, score: float) -> None:
        pass

    @abstractmethod
    async def update_streak(self, user_id: uuid.UUID, increment: int) -> None:
        pass

    @abstractmethod
    async def add_xp(self, user_id: uuid.UUID, xp: int) -> None:
        pass
