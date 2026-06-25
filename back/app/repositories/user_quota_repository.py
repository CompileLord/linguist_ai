import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy import select, update
from app.models.user_quota import UserQuota
from app.repositories.interfaces.user_quota import AbstractUserQuotaRepository

class UserQuotaRepository(AbstractUserQuotaRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserQuota]:
        result = await self._session.execute(
            select(UserQuota).filter(UserQuota.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserQuota]:
        result = await self._session.execute(
            select(UserQuota).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, model: UserQuota) -> UserQuota:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserQuota) -> UserQuota:
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

    async def get_by_user_and_function(self, user_id: uuid.UUID, function_name: str) -> Optional[UserQuota]:
        result = await self._session.execute(
            select(UserQuota).filter(
                UserQuota.user_id == user_id,
                UserQuota.function_name == function_name
            )
        )
        return result.scalar_one_or_none()

    async def get_all_for_user(self, user_id: uuid.UUID) -> List[UserQuota]:
        result = await self._session.execute(
            select(UserQuota).filter(UserQuota.user_id == user_id)
        )
        return list(result.scalars().all())

    async def increment_usage(self, user_id: uuid.UUID, function_name: str, delta: int) -> int:
        stmt = (
            update(UserQuota)
            .where(
                UserQuota.user_id == user_id,
                UserQuota.function_name == function_name
            )
            .values(current_usage=UserQuota.current_usage + delta)
        )
        await self._session.execute(stmt)
        await self._session.flush()
        
        result = await self.get_by_user_and_function(user_id, function_name)
        return result.current_usage if result else 0

    async def reset_quota(
        self,
        user_id: uuid.UUID,
        function_name: str,
        daily_limit: int,
        activity_date: date
    ) -> UserQuota:
        stmt = (
            update(UserQuota)
            .where(
                UserQuota.user_id == user_id,
                UserQuota.function_name == function_name
            )
            .values(
                current_usage=0,
                last_reset_date=activity_date,
                daily_limit=daily_limit
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_and_function(user_id, function_name)
