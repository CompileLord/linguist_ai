import uuid
from typing import List, Optional
from sqlalchemy import select, func, and_
from app.models.mission import Mission
from app.models.user_mission_attempt import UserMissionAttempt
from app.models.enums import CEFRLevel
from app.repositories.interfaces.mission import AbstractMissionRepository, AbstractMissionAttemptRepository
from app.core.exceptions import MissionNotFoundError, AttemptNotFoundError

class MissionRepository(AbstractMissionRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[Mission]:
        result = await self._session.execute(select(Mission).filter(Mission.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Mission]:
        result = await self._session.execute(select(Mission).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: Mission) -> Mission:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: Mission) -> Mission:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        mission = await self.get_by_id(id)
        if mission:
            await self._session.delete(mission)
            await self._session.flush()
            return True
        return False

    async def list_available(
        self,
        cefr_level: str,
        related_goal: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Mission]:
        level_map = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
        user_val = level_map.get(cefr_level, 1)
        allowed_levels = [lvl for lvl, val in level_map.items() if val <= user_val]
        
        stmt = select(Mission).filter(
            and_(
                Mission.is_active == True,
                Mission.cefr_level_min.in_(allowed_levels)
            )
        )
        if related_goal:
            stmt = stmt.filter(Mission.related_goal == related_goal)
        stmt = stmt.order_by(Mission.difficulty_rating.asc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_all_active(self) -> List[Mission]:
        result = await self._session.execute(select(Mission).filter(Mission.is_active == True))
        return list(result.scalars().all())

    async def count_by_goal_and_level(self, related_goal: str, cefr_level: str) -> int:
        result = await self._session.execute(
            select(func.count(Mission.id)).filter(
                and_(
                    Mission.related_goal == related_goal,
                    Mission.cefr_level_min == cefr_level,
                    Mission.is_active == True
                )
            )
        )
        return result.scalar() or 0

class MissionAttemptRepository(AbstractMissionAttemptRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserMissionAttempt]:
        result = await self._session.execute(select(UserMissionAttempt).filter(UserMissionAttempt.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserMissionAttempt]:
        result = await self._session.execute(select(UserMissionAttempt).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: UserMissionAttempt) -> UserMissionAttempt:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserMissionAttempt) -> UserMissionAttempt:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        attempt = await self.get_by_id(id)
        if attempt:
            await self._session.delete(attempt)
            await self._session.flush()
            return True
        return False

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        mission_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserMissionAttempt]:
        stmt = select(UserMissionAttempt).filter(UserMissionAttempt.user_id == user_id)
        if mission_id:
            stmt = stmt.filter(UserMissionAttempt.mission_id == mission_id)
        if status:
            stmt = stmt.filter(UserMissionAttempt.status == status)
        stmt = stmt.order_by(UserMissionAttempt.started_at.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_attempt(
        self,
        user_id: uuid.UUID,
        mission_id: uuid.UUID
    ) -> Optional[UserMissionAttempt]:
        result = await self._session.execute(
            select(UserMissionAttempt)
            .filter(and_(UserMissionAttempt.user_id == user_id, UserMissionAttempt.mission_id == mission_id))
            .order_by(UserMissionAttempt.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def count_completed(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count(UserMissionAttempt.id)).filter(
                and_(
                    UserMissionAttempt.user_id == user_id,
                    UserMissionAttempt.status == "completed"
                )
            )
        )
        return result.scalar() or 0
