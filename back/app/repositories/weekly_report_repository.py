import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.weekly_report import WeeklyReport
from app.repositories.interfaces.weekly_report import AbstractWeeklyReportRepository

class WeeklyReportRepository(AbstractWeeklyReportRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[WeeklyReport]:
        result = await self._session.execute(
            select(WeeklyReport).filter(WeeklyReport.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[WeeklyReport]:
        result = await self._session.execute(
            select(WeeklyReport).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, model: WeeklyReport) -> WeeklyReport:
        existing_result = await self._session.execute(
            select(WeeklyReport).filter_by(user_id=model.user_id, period_start=model.period_start)
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing

        async with self._session.begin_nested():
            try:
                self._session.add(model)
                await self._session.flush()
                return model
            except IntegrityError:
                pass

        existing_result = await self._session.execute(
            select(WeeklyReport).filter_by(user_id=model.user_id, period_start=model.period_start)
        )
        return existing_result.scalar_one()

    async def update(self, model: WeeklyReport) -> WeeklyReport:
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

    async def get_latest(self, user_id: uuid.UUID) -> Optional[WeeklyReport]:
        result = await self._session.execute(
            select(WeeklyReport)
            .filter(WeeklyReport.user_id == user_id)
            .order_by(WeeklyReport.generated_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID, limit: int = 10, offset: int = 0) -> List[WeeklyReport]:
        result = await self._session.execute(
            select(WeeklyReport)
            .filter(WeeklyReport.user_id == user_id)
            .order_by(WeeklyReport.period_start.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def exists_for_period(self, user_id: uuid.UUID, period_start: date) -> bool:
        result = await self._session.execute(
            select(WeeklyReport).filter_by(user_id=user_id, period_start=period_start)
        )
        return result.scalar_one_or_none() is not None
