import uuid
from abc import abstractmethod
from typing import Optional, List
from app.models.user_goal import UserGoal
from app.repositories.interfaces.base import AbstractRepository

class AbstractGoalsRepository(AbstractRepository[UserGoal, uuid.UUID]):
    @abstractmethod
    async def get_by_user_id(self, user_id: uuid.UUID) -> List[UserGoal]:
        pass

    @abstractmethod
    async def get_primary_goal(self, user_id: uuid.UUID) -> Optional[UserGoal]:
        pass

    @abstractmethod
    async def set_primary_goal(self, user_id: uuid.UUID, goal_id: uuid.UUID) -> None:
        pass

    @abstractmethod
    async def delete_all_for_user(self, user_id: uuid.UUID) -> int:
        pass
