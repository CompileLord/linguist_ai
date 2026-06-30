import uuid
from abc import abstractmethod
from datetime import date
from typing import List, Optional
from app.models.user_quota import UserQuota
from app.repositories.interfaces.base import AbstractRepository

class AbstractUserQuotaRepository(AbstractRepository[UserQuota, uuid.UUID]):
    @abstractmethod
    async def get_by_user_and_function(self, user_id: uuid.UUID, function_name: str) -> Optional[UserQuota]:
        pass

    @abstractmethod
    async def get_all_for_user(self, user_id: uuid.UUID) -> List[UserQuota]:
        pass

    @abstractmethod
    async def increment_usage(self, user_id: uuid.UUID, function_name: str, delta: int) -> int:
        pass

    @abstractmethod
    async def reset_quota(
        self,
        user_id: uuid.UUID,
        function_name: str,
        daily_limit: int,
        activity_date: date
    ) -> UserQuota:
        pass
