import uuid
from typing import List, Optional
from sqlalchemy import select, exists
from sqlalchemy.orm import joinedload
from app.models.user_profile import UserProfile
from app.models.enums import CEFRLevel
from app.repositories.interfaces.profile import AbstractProfileRepository

class ProfileRepository(AbstractProfileRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserProfile]:
        result = await self._session.execute(
            select(UserProfile)
            .filter(UserProfile.id == id)
            .options(joinedload(UserProfile.target_language))
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserProfile]:
        result = await self._session.execute(
            select(UserProfile)
            .offset(skip)
            .limit(limit)
            .options(joinedload(UserProfile.target_language))
        )
        return list(result.scalars().all())

    async def create(self, model: UserProfile) -> UserProfile:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserProfile) -> UserProfile:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        profile = await self.get_by_id(id)
        if profile:
            await self._session.delete(profile)
            await self._session.flush()
            return True
        return False

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[UserProfile]:
        result = await self._session.execute(
            select(UserProfile)
            .filter(UserProfile.user_id == user_id)
            .options(joinedload(UserProfile.target_language))
        )
        return result.scalar_one_or_none()

    async def exists_for_user(self, user_id: uuid.UUID) -> bool:
        stmt = select(exists().where(UserProfile.user_id == user_id))
        result = await self._session.execute(stmt)
        return bool(result.scalar())

    async def update_level(self, user_id: uuid.UUID, level: CEFRLevel, score: float) -> None:
        profile = await self.get_by_user_id(user_id)
        if profile:
            profile.current_level = level
            profile.placement_score = score
            profile.onboarding_completed = True
            self._session.add(profile)
            await self._session.flush()

    async def update_streak(self, user_id: uuid.UUID, increment: int) -> None:
        profile = await self.get_by_user_id(user_id)
        if profile:
            profile.streak_count += increment
            self._session.add(profile)
            await self._session.flush()

    async def add_xp(self, user_id: uuid.UUID, xp: int) -> None:
        profile = await self.get_by_user_id(user_id)
        if profile:
            profile.total_xp += xp
            self._session.add(profile)
            await self._session.flush()
