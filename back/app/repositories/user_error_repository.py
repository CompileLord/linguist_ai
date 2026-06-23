import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, desc
from app.models.user_error import UserError
from app.models.enums import ErrorCategory
from app.repositories.interfaces.user_error import AbstractUserErrorRepository

class UserErrorRepository(AbstractUserErrorRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[UserError]:
        result = await self._session.execute(select(UserError).filter(UserError.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserError]:
        result = await self._session.execute(select(UserError).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: UserError) -> UserError:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: UserError) -> UserError:
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

    async def find_matching_error(
        self,
        user_id: uuid.UUID,
        category: ErrorCategory,
        error_text: str
    ) -> Optional[UserError]:
        normalized = error_text.strip().lower()
        result = await self._session.execute(
            select(UserError).filter(
                UserError.user_id == user_id,
                UserError.category == category,
                func.lower(UserError.error_text) == normalized
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        category: Optional[ErrorCategory] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = "recent"
    ) -> List[UserError]:
        query = select(UserError).filter(UserError.user_id == user_id)
        if category is not None:
            query = query.filter(UserError.category == category)
        
        if sort_by == "frequent":
            query = query.order_by(desc(UserError.occurrence_count), desc(UserError.last_occurred_at))
        else:
            query = query.order_by(desc(UserError.last_occurred_at))
            
        query = query.offset(skip).limit(limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def list_frequent(
        self,
        user_id: uuid.UUID,
        min_occurrence_count: int = 3,
        limit: int = 10
    ) -> List[UserError]:
        query = (
            select(UserError)
            .filter(
                UserError.user_id == user_id,
                UserError.occurrence_count >= min_occurrence_count
            )
            .order_by(desc(UserError.occurrence_count), desc(UserError.last_occurred_at))
            .limit(limit)
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_error_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:

        totals_result = await self._session.execute(
            select(
                func.coalesce(func.sum(UserError.occurrence_count), 0).label("total"),
                func.coalesce(
                    func.sum(UserError.occurrence_count).filter(UserError.category == ErrorCategory.GRAMMAR),
                    0
                ).label("grammar"),
                func.coalesce(
                    func.sum(UserError.occurrence_count).filter(UserError.category == ErrorCategory.VOCABULARY),
                    0
                ).label("vocabulary")
            ).filter(UserError.user_id == user_id)
        )
        totals = totals_result.one()
        
        most_common_result = await self._session.execute(
            select(UserError.error_text)
            .filter(UserError.user_id == user_id)
            .order_by(desc(UserError.occurrence_count), desc(UserError.last_occurred_at))
            .limit(1)
        )
        most_common = most_common_result.scalar_one_or_none()
        
        return {
            "total_errors": int(totals.total),
            "grammar_errors": int(totals.grammar),
            "vocabulary_errors": int(totals.vocabulary),
            "most_common_error_text": most_common
        }
