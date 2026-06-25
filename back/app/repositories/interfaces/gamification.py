import uuid
from abc import abstractmethod
from datetime import date
from typing import Optional
from app.models.user_gamification import UserGamification
from app.repositories.interfaces.base import AbstractRepository

class AbstractGamificationRepository(AbstractRepository[UserGamification, uuid.UUID]):
    @abstractmethod
    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[UserGamification]:
        pass

    @abstractmethod
    async def add_xp(self, user_id: uuid.UUID, delta: int) -> UserGamification:
        pass

    @abstractmethod
    async def update_streak(
        self,
        user_id: uuid.UUID,
        current_streak: int,
        longest_streak: int,
        last_activity_date: date
    ) -> UserGamification:
        pass

    @abstractmethod
    async def update_level(self, user_id: uuid.UUID, current_game_level: int) -> UserGamification:
        pass

    @abstractmethod
    async def set_unread_report(self, user_id: uuid.UUID, has_unread_report: bool) -> UserGamification:
        pass

    @abstractmethod
    async def add_speaking_minutes(self, user_id: uuid.UUID, minutes: int) -> UserGamification:
        pass

