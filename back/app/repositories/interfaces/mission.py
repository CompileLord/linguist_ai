import uuid
from abc import abstractmethod
from typing import List, Optional
from app.models.mission import Mission
from app.models.user_mission_attempt import UserMissionAttempt
from app.repositories.interfaces.base import AbstractRepository

class AbstractMissionRepository(AbstractRepository[Mission, uuid.UUID]):
    @abstractmethod
    async def list_available(
        self,
        cefr_level: str,
        related_goal: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Mission]:
        pass

    @abstractmethod
    async def list_all_active(self) -> List[Mission]:
        pass

    @abstractmethod
    async def count_by_goal_and_level(self, related_goal: str, cefr_level: str) -> int:
        pass

class AbstractMissionAttemptRepository(AbstractRepository[UserMissionAttempt, uuid.UUID]):
    @abstractmethod
    async def list_by_user(
        self,
        user_id: uuid.UUID,
        mission_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserMissionAttempt]:
        pass

    @abstractmethod
    async def get_latest_attempt(
        self,
        user_id: uuid.UUID,
        mission_id: uuid.UUID
    ) -> Optional[UserMissionAttempt]:
        pass

    @abstractmethod
    async def count_completed(self, user_id: uuid.UUID) -> int:
        pass
