import uuid
from datetime import datetime, date, time
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from app.models.listening_exam import ListeningExam
from app.models.user_listening_attempt import UserListeningAttempt
from app.models.enums import CEFRLevel
from app.repositories.interfaces.listening_exam import AbstractListeningExamRepository
from app.core.exceptions import ConflictException, NotFoundException

class ListeningExamRepository(AbstractListeningExamRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[ListeningExam]:
        result = await self._session.execute(select(ListeningExam).filter(ListeningExam.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ListeningExam]:
        result = await self._session.execute(select(ListeningExam).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: ListeningExam) -> ListeningExam:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: ListeningExam) -> ListeningExam:
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

    async def get_available_exams(
        self,
        user_id: uuid.UUID,
        language_id: uuid.UUID,
        level: CEFRLevel,
        skip: int = 0,
        limit: int = 100
    ) -> List[ListeningExam]:
        query = (
            select(ListeningExam)
            .outerjoin(
                UserListeningAttempt,
                (ListeningExam.id == UserListeningAttempt.exam_id) & (UserListeningAttempt.user_id == user_id)
            )
            .filter(
                ListeningExam.language_id == language_id,
                ListeningExam.level == level,
                UserListeningAttempt.id.is_(None)
            )
            .offset(skip).limit(limit)
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def create_attempt(
        self,
        model: UserListeningAttempt
    ) -> UserListeningAttempt:
        try:
            self._session.add(model)
            await self._session.flush()
            return model
        except IntegrityError:
            await self._session.rollback()
            raise ConflictException(detail="Listening exam already attempted")

    async def has_user_completed(
        self,
        user_id: uuid.UUID,
        exam_id: uuid.UUID
    ) -> bool:
        result = await self._session.execute(
            select(UserListeningAttempt).filter(
                and_(
                    UserListeningAttempt.user_id == user_id,
                    UserListeningAttempt.exam_id == exam_id
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def count_daily_attempts(
        self,
        user_id: uuid.UUID,
        activity_date: date
    ) -> int:
        start_dt = datetime.combine(activity_date, time.min)
        end_dt = datetime.combine(activity_date, time.max)
        query = select(func.count(UserListeningAttempt.id)).filter(
            and_(
                UserListeningAttempt.user_id == user_id,
                UserListeningAttempt.completed_at >= start_dt,
                UserListeningAttempt.completed_at <= end_dt
            )
        )
        result = await self._session.execute(query)
        return result.scalar() or 0

    async def get_attempt_history(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserListeningAttempt]:
        query = select(UserListeningAttempt).filter(
            UserListeningAttempt.user_id == user_id
        ).order_by(
            UserListeningAttempt.completed_at.desc()
        ).offset(skip).limit(limit).options(
            selectinload(UserListeningAttempt.exam)
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def count_available_exams(self, user_id: uuid.UUID, language_id: uuid.UUID, level: str) -> int:
        from sqlalchemy import select, func

        query = (
            select(func.count(ListeningExam.id))
            .outerjoin(
                UserListeningAttempt,
                (ListeningExam.id == UserListeningAttempt.exam_id) & (UserListeningAttempt.user_id == user_id)
            )
            .filter(
                ListeningExam.language_id == language_id,
                ListeningExam.level == level,
                UserListeningAttempt.id.is_(None)
            )
        )
        result = await self._session.execute(query)
        return result.scalar() or 0
