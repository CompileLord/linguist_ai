import uuid
from typing import List, Optional
from sqlalchemy import select, update, delete
from app.models.user_goal import UserGoal
from app.repositories.interfaces.goals import AbstractGoalsRepository

class GoalsRepository(AbstractGoalsRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserGoal]:
        result = await self._session.execute(select(UserGoal).filter(UserGoal.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserGoal]:
        result = await self._session.execute(select(UserGoal).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: UserGoal) -> UserGoal:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserGoal) -> UserGoal:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        goal = await self.get_by_id(id)
        if goal:
            await self._session.delete(goal)
            await self._session.flush()
            return True
        return False

    async def get_by_user_id(self, user_id: uuid.UUID) -> List[UserGoal]:
        result = await self._session.execute(
            select(UserGoal)
            .filter(UserGoal.user_id == user_id)
            .order_by(UserGoal.priority_order.asc())
        )
        return list(result.scalars().all())

    async def get_primary_goal(self, user_id: uuid.UUID) -> Optional[UserGoal]:
        result = await self._session.execute(
            select(UserGoal).filter(UserGoal.user_id == user_id, UserGoal.is_primary == True)
        )
        return result.scalar_one_or_none()

    async def set_primary_goal(self, user_id: uuid.UUID, goal_id: uuid.UUID) -> None:
        await self._session.execute(
            update(UserGoal)
            .filter(UserGoal.user_id == user_id)
            .values(is_primary=False)
        )
        await self._session.execute(
            update(UserGoal)
            .filter(UserGoal.id == goal_id, UserGoal.user_id == user_id)
            .values(is_primary=True)
        )
        await self._session.flush()

    async def delete_all_for_user(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            delete(UserGoal).filter(UserGoal.user_id == user_id)
        )
        await self._session.flush()
        return result.rowcount
