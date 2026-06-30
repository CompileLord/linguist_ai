import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_
from app.models.tutor_session import TutorSession
from app.repositories.interfaces.tutor import AbstractTutorSessionRepository
from app.core.exceptions import SessionNotFoundError

class TutorSessionRepository(AbstractTutorSessionRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[TutorSession]:
        result = await self._session.execute(select(TutorSession).filter(TutorSession.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[TutorSession]:
        result = await self._session.execute(select(TutorSession).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: TutorSession) -> TutorSession:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: TutorSession) -> TutorSession:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        session = await self.get_by_id(id)
        if session:
            await self._session.delete(session)
            await self._session.flush()
            return True
        return False

    async def get_active_session(self, user_id: uuid.UUID) -> Optional[TutorSession]:
        result = await self._session.execute(
            select(TutorSession)
            .filter(and_(TutorSession.user_id == user_id, TutorSession.is_active == True))
            .order_by(TutorSession.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        include_ended: bool = False
    ) -> List[TutorSession]:
        stmt = select(TutorSession).filter(TutorSession.user_id == user_id)
        if not include_ended:
            stmt = stmt.filter(TutorSession.is_active == True)
        stmt = stmt.order_by(TutorSession.started_at.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def end_session(self, session_id: uuid.UUID) -> Optional[TutorSession]:
        session = await self.get_by_id(session_id)
        if not session:
            raise SessionNotFoundError()
        session.is_active = False
        session.ended_at = datetime.utcnow()
        self._session.add(session)
        await self._session.flush()
        return session

    async def increment_message_count(self, session_id: uuid.UUID) -> None:
        session = await self.get_by_id(session_id)
        if not session:
            raise SessionNotFoundError()
        session.message_count += 1
        self._session.add(session)
        await self._session.flush()
