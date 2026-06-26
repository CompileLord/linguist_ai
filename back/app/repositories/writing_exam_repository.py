import uuid
from datetime import datetime, date, time
from typing import List, Optional
from sqlalchemy import select, func, and_
from app.models.writing_exam import WritingExam
from app.repositories.interfaces.writing_exam import AbstractWritingExamRepository
from app.core.exceptions import NotFoundException

class WritingExamRepository(AbstractWritingExamRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[WritingExam]:
        result = await self._session.execute(select(WritingExam).filter(WritingExam.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[WritingExam]:
        result = await self._session.execute(select(WritingExam).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: WritingExam) -> WritingExam:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: WritingExam) -> WritingExam:
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

    async def update_submission(
        self,
        exam_id: uuid.UUID,
        submitted_text: str,
        scores: dict,
        overall_score: float,
        feedback_text: str
    ) -> WritingExam:
        exam = await self.get_by_id(exam_id)
        if not exam:
            raise NotFoundException(detail="Writing exam not found")
        exam.submitted_text = submitted_text
        exam.scores = scores
        exam.overall_score = overall_score
        exam.feedback_text = feedback_text
        self._session.add(exam)
        await self._session.flush()
        return exam

    async def get_user_history(
        self,
        user_id: uuid.UUID,
        limit: int = 10,
        offset: int = 0,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[WritingExam]:
        query = select(WritingExam).filter(WritingExam.user_id == user_id)
        if date_from:
            query = query.filter(WritingExam.created_at >= date_from)
        if date_to:
            query = query.filter(WritingExam.created_at <= date_to)
        query = query.order_by(WritingExam.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def count_daily_attempts(
        self,
        user_id: uuid.UUID,
        activity_date: date
    ) -> int:
        start_dt = datetime.combine(activity_date, time.min)
        end_dt = datetime.combine(activity_date, time.max)
        query = select(func.count(WritingExam.id)).filter(
            and_(
                WritingExam.user_id == user_id,
                WritingExam.created_at >= start_dt,
                WritingExam.created_at <= end_dt
            )
        )
        result = await self._session.execute(query)
        return result.scalar() or 0

    async def count_by_user(self, user_id: uuid.UUID) -> int:
        from sqlalchemy import select, func
        query = select(func.count(WritingExam.id)).filter(WritingExam.user_id == user_id)
        result = await self._session.execute(query)
        return result.scalar() or 0
