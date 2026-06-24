import uuid
from typing import List, Optional
from sqlalchemy import select, func, and_
from app.models.tutor_message import TutorMessage
from app.models.tutor_session import TutorSession
from app.repositories.interfaces.tutor import AbstractTutorMessageRepository
from app.core.exceptions import SessionNotFoundError

class TutorMessageRepository(AbstractTutorMessageRepository):
    async def _validate_session(self, session_id: uuid.UUID) -> None:
        result = await self._session.execute(select(TutorSession).filter(TutorSession.id == session_id))
        if not result.scalar_one_or_none():
            raise SessionNotFoundError()

    async def get_by_id(self, id: uuid.UUID) -> Optional[TutorMessage]:
        result = await self._session.execute(select(TutorMessage).filter(TutorMessage.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[TutorMessage]:
        result = await self._session.execute(select(TutorMessage).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: TutorMessage) -> TutorMessage:
        await self._validate_session(model.session_id)
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: TutorMessage) -> TutorMessage:
        await self._validate_session(model.session_id)
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        msg = await self.get_by_id(id)
        if msg:
            await self._session.delete(msg)
            await self._session.flush()
            return True
        return False

    async def list_by_session(
        self,
        session_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
        order: str = "asc"
    ) -> List[TutorMessage]:
        await self._validate_session(session_id)
        stmt = select(TutorMessage).filter(TutorMessage.session_id == session_id)
        if order == "desc":
            stmt = stmt.order_by(TutorMessage.created_at.desc())
        else:
            stmt = stmt.order_by(TutorMessage.created_at.asc())
        stmt = stmt.offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_last_n_messages(self, session_id: uuid.UUID, n: int) -> List[TutorMessage]:
        await self._validate_session(session_id)
        result = await self._session.execute(
            select(TutorMessage)
            .filter(TutorMessage.session_id == session_id)
            .order_by(TutorMessage.created_at.desc())
            .limit(n)
        )
        messages = list(result.scalars().all())
        messages.reverse()
        return messages

    async def count_by_session(self, session_id: uuid.UUID) -> int:
        await self._validate_session(session_id)
        result = await self._session.execute(
            select(func.count(TutorMessage.id)).filter(TutorMessage.session_id == session_id)
        )
        return result.scalar() or 0
