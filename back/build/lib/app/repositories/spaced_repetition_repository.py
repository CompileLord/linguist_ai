import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from app.models.spaced_repetition_item import SpacedRepetitionItem
from app.models.enums import SpacedRepetitionItemType
from app.core.exceptions import DuplicateItemError
from app.repositories.interfaces.spaced_repetition import AbstractSpacedRepetitionRepository

class SpacedRepetitionRepository(AbstractSpacedRepetitionRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[SpacedRepetitionItem]:
        result = await self._session.execute(select(SpacedRepetitionItem).filter(SpacedRepetitionItem.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[SpacedRepetitionItem]:
        result = await self._session.execute(select(SpacedRepetitionItem).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: SpacedRepetitionItem) -> SpacedRepetitionItem:
        existing = await self.get_by_user_and_item(model.user_id, model.item_type, model.item_id)
        if existing:
            raise DuplicateItemError(f"Spaced repetition item already exists for user {model.user_id} and item {model.item_id}")
        try:
            self._session.add(model)
            await self._session.flush()
            return model
        except IntegrityError:
            await self._session.rollback()
            raise DuplicateItemError(f"Spaced repetition item already exists for user {model.user_id} and item {model.item_id}")

    async def update(self, model: SpacedRepetitionItem) -> SpacedRepetitionItem:
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

    async def get_by_user_and_item(
        self,
        user_id: uuid.UUID,
        item_type: SpacedRepetitionItemType,
        item_id: uuid.UUID
    ) -> Optional[SpacedRepetitionItem]:
        result = await self._session.execute(
            select(SpacedRepetitionItem).filter(
                SpacedRepetitionItem.user_id == user_id,
                SpacedRepetitionItem.item_type == item_type,
                SpacedRepetitionItem.item_id == item_id
            )
        )
        return result.scalar_one_or_none()

    async def list_due_items(
        self,
        user_id: uuid.UUID,
        cutoff_datetime: datetime,
        item_type: Optional[SpacedRepetitionItemType] = None,
        limit: int = 20
    ) -> List[SpacedRepetitionItem]:
        query = select(SpacedRepetitionItem).filter(
            SpacedRepetitionItem.user_id == user_id,
            SpacedRepetitionItem.next_review_at <= cutoff_datetime
        )
        if item_type is not None:
            query = query.filter(SpacedRepetitionItem.item_type == item_type)
        
        query = query.order_by(
            SpacedRepetitionItem.next_review_at.asc(),
            SpacedRepetitionItem.mastery_percent.asc(),
            SpacedRepetitionItem.ease_factor.asc()
        ).limit(limit)
        
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def count_due_items(
        self,
        user_id: uuid.UUID,
        cutoff_datetime: datetime,
        item_type: Optional[SpacedRepetitionItemType] = None
    ) -> int:
        query = select(func.count(SpacedRepetitionItem.id)).filter(
            SpacedRepetitionItem.user_id == user_id,
            SpacedRepetitionItem.next_review_at <= cutoff_datetime
        )
        if item_type is not None:
            query = query.filter(SpacedRepetitionItem.item_type == item_type)
        
        result = await self._session.execute(query)
        return result.scalar() or 0

    async def get_daily_review_counts(self, user_id: uuid.UUID, last_n_days: int = 30) -> List[Tuple[str, int]]:
        cutoff_date = datetime.utcnow() - timedelta(days=last_n_days)
        query = (
            select(
                func.date(SpacedRepetitionItem.last_reviewed_at).label("review_date"),
                func.count(SpacedRepetitionItem.id).label("count")
            )
            .filter(
                SpacedRepetitionItem.user_id == user_id,
                SpacedRepetitionItem.last_reviewed_at >= cutoff_date
            )
            .group_by(func.date(SpacedRepetitionItem.last_reviewed_at))
            .order_by(func.date(SpacedRepetitionItem.last_reviewed_at).asc())
        )
        result = await self._session.execute(query)
        return [(str(row.review_date), int(row.count)) for row in result.all() if row.review_date is not None]
