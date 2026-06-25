import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.repositories.interfaces.achievement import AbstractAchievementRepository

class AchievementRepository(AbstractAchievementRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[Achievement]:
        result = await self._session.execute(
            select(Achievement).filter(Achievement.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Achievement]:
        result = await self._session.execute(
            select(Achievement).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, model: Achievement) -> Achievement:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: Achievement) -> Achievement:
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

    async def get_all_achievements(self) -> List[Achievement]:
        result = await self._session.execute(
            select(Achievement).order_by(Achievement.condition_type, Achievement.condition_value)
        )
        return list(result.scalars().all())

    async def get_user_achievements(self, user_id: uuid.UUID) -> List[UserAchievement]:
        result = await self._session.execute(
            select(UserAchievement)
            .filter(UserAchievement.user_id == user_id)
            .options(selectinload(UserAchievement.achievement))
            .order_by(UserAchievement.unlocked_at.desc())
        )
        return list(result.scalars().all())

    async def has_achievement(self, user_id: uuid.UUID, achievement_code: str) -> bool:
        result = await self._session.execute(
            select(UserAchievement)
            .join(Achievement)
            .filter(UserAchievement.user_id == user_id, Achievement.code == achievement_code)
        )
        return result.scalar_one_or_none() is not None

    async def award(self, user_id: uuid.UUID, achievement_id: uuid.UUID) -> UserAchievement:
        existing_result = await self._session.execute(
            select(UserAchievement).filter_by(user_id=user_id, achievement_id=achievement_id)
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing

        async with self._session.begin_nested():
            try:
                user_ach = UserAchievement(user_id=user_id, achievement_id=achievement_id)
                self._session.add(user_ach)
                await self._session.flush()
                return user_ach
            except IntegrityError:
                pass

        existing_result = await self._session.execute(
            select(UserAchievement).filter_by(user_id=user_id, achievement_id=achievement_id)
        )
        return existing_result.scalar_one()

    async def get_recent(self, user_id: uuid.UUID, days: int = 7) -> List[UserAchievement]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self._session.execute(
            select(UserAchievement)
            .filter(UserAchievement.user_id == user_id, UserAchievement.unlocked_at >= cutoff)
            .options(selectinload(UserAchievement.achievement))
            .order_by(UserAchievement.unlocked_at.desc())
        )
        return list(result.scalars().all())
