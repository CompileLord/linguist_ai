import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy import select, update, case
from app.models.user_gamification import UserGamification
from app.repositories.interfaces.gamification import AbstractGamificationRepository
from app.core.exceptions import NotFoundException

class GamificationRepository(AbstractGamificationRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserGamification]:
        result = await self._session.execute(
            select(UserGamification).filter(UserGamification.user_id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserGamification]:
        result = await self._session.execute(
            select(UserGamification).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, model: UserGamification) -> UserGamification:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserGamification) -> UserGamification:
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

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[UserGamification]:
        result = await self._session.execute(
            select(UserGamification).filter(UserGamification.user_id == user_id)
        )
        gamification = result.scalar_one_or_none()
        if not gamification:
            raise NotFoundException(detail="User gamification state not found")
        return gamification

    async def add_xp(self, user_id: uuid.UUID, delta: int) -> UserGamification:
        stmt = (
            update(UserGamification)
            .where(UserGamification.user_id == user_id)
            .values(total_xp=UserGamification.total_xp + delta)
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_id(user_id)

    async def update_streak(
        self,
        user_id: uuid.UUID,
        current_streak: int,
        longest_streak: int,
        last_activity_date: date
    ) -> UserGamification:
        stmt = (
            update(UserGamification)
            .where(UserGamification.user_id == user_id)
            .values(
                current_streak=current_streak,
                longest_streak=case(
                    (UserGamification.longest_streak < longest_streak, longest_streak),
                    else_=UserGamification.longest_streak
                ),
                last_activity_date=last_activity_date
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_id(user_id)

    async def update_level(self, user_id: uuid.UUID, current_game_level: int) -> UserGamification:
        stmt = (
            update(UserGamification)
            .where(UserGamification.user_id == user_id)
            .values(current_game_level=current_game_level)
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_id(user_id)

    async def set_unread_report(self, user_id: uuid.UUID, has_unread_report: bool) -> UserGamification:
        stmt = (
            update(UserGamification)
            .where(UserGamification.user_id == user_id)
            .values(has_unread_report=has_unread_report)
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_id(user_id)

    async def add_speaking_minutes(self, user_id: uuid.UUID, minutes: int) -> UserGamification:
        stmt = (
            update(UserGamification)
            .where(UserGamification.user_id == user_id)
            .values(total_speaking_minutes=UserGamification.total_speaking_minutes + minutes)
        )
        await self._session.execute(stmt)
        await self._session.flush()
        return await self.get_by_user_id(user_id)

