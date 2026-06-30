import uuid
from abc import abstractmethod
from typing import List, Optional
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.repositories.interfaces.base import AbstractRepository

class AbstractAchievementRepository(AbstractRepository[Achievement, uuid.UUID]):
    @abstractmethod
    async def get_all_achievements(self) -> List[Achievement]:
        pass

    @abstractmethod
    async def get_user_achievements(self, user_id: uuid.UUID) -> List[UserAchievement]:
        pass

    @abstractmethod
    async def has_achievement(self, user_id: uuid.UUID, achievement_code: str) -> bool:
        pass

    @abstractmethod
    async def award(self, user_id: uuid.UUID, achievement_id: uuid.UUID) -> UserAchievement:
        pass

    @abstractmethod
    async def get_recent(self, user_id: uuid.UUID, days: int = 7) -> List[UserAchievement]:
        pass
