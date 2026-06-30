import uuid
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from app.models.lesson import Lesson
from app.models.user_lesson import UserLesson
from app.models.enums import CEFRLevel
from app.repositories.interfaces.lesson import AbstractLessonRepository, AbstractUserLessonRepository
from app.core.exceptions import NotFoundException

class LessonRepository(AbstractLessonRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[Lesson]:
        result = await self._session.execute(select(Lesson).filter(Lesson.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Lesson]:
        result = await self._session.execute(select(Lesson).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: Lesson) -> Lesson:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: Lesson) -> Lesson:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        lesson = await self.get_by_id(id)
        if lesson:
            await self._session.delete(lesson)
            await self._session.flush()
            return True
        return False

    async def find_cached(self, language_id: uuid.UUID, cefr_level: CEFRLevel, topic: str) -> Optional[Lesson]:
        result = await self._session.execute(
            select(Lesson).filter(
                Lesson.language_id == language_id,
                Lesson.cefr_level == cefr_level,
                Lesson.topic == topic
            )
        )
        return result.scalar_one_or_none()

    async def get_by_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel, limit: int = 100, offset: int = 0) -> List[Lesson]:
        result = await self._session.execute(
            select(Lesson)
            .filter(Lesson.language_id == language_id, Lesson.cefr_level == cefr_level)
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel) -> int:
        result = await self._session.execute(
            select(func.count(Lesson.id)).filter(
                Lesson.language_id == language_id,
                Lesson.cefr_level == cefr_level
            )
        )
        return result.scalar() or 0

class UserLessonRepository(AbstractUserLessonRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserLesson]:
        result = await self._session.execute(
            select(UserLesson)
            .filter(UserLesson.id == id)
            .options(joinedload(UserLesson.lesson))
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserLesson]:
        result = await self._session.execute(
            select(UserLesson)
            .offset(skip)
            .limit(limit)
            .options(joinedload(UserLesson.lesson))
        )
        return list(result.scalars().all())

    async def create(self, model: UserLesson) -> UserLesson:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserLesson) -> UserLesson:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        ul = await self.get_by_id(id)
        if ul:
            await self._session.delete(ul)
            await self._session.flush()
            return True
        return False

    async def get_user_lesson(self, user_id: uuid.UUID, lesson_id: uuid.UUID) -> Optional[UserLesson]:
        result = await self._session.execute(
            select(UserLesson)
            .filter(UserLesson.user_id == user_id, UserLesson.lesson_id == lesson_id)
            .options(joinedload(UserLesson.lesson))
        )
        return result.scalar_one_or_none()

    async def get_user_history(self, user_id: uuid.UUID, status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[UserLesson]:
        stmt = select(UserLesson).filter(UserLesson.user_id == user_id).options(joinedload(UserLesson.lesson))
        if status:
            stmt = stmt.filter(UserLesson.status == status)
        stmt = stmt.order_by(UserLesson.started_at.desc(), UserLesson.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_next_incomplete(self, user_id: uuid.UUID) -> Optional[UserLesson]:
        result = await self._session.execute(
            select(UserLesson)
            .filter(UserLesson.user_id == user_id, UserLesson.status != "completed")
            .order_by(UserLesson.created_at.asc())
            .limit(1)
            .options(joinedload(UserLesson.lesson))
        )
        return result.scalar_one_or_none()

    async def update_progress(self, user_lesson_id: uuid.UUID, updates: dict) -> UserLesson:
        ul = await self.get_by_id(user_lesson_id)
        if not ul:
            raise NotFoundException("User lesson record not found")
        for key, value in updates.items():
            setattr(ul, key, value)
        self._session.add(ul)
        await self._session.flush()
        return ul
