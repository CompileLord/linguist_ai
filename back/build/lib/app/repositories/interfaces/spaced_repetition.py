import uuid
from abc import abstractmethod
from datetime import datetime
from typing import Optional, List, Tuple
from app.models.spaced_repetition_item import SpacedRepetitionItem
from app.models.enums import SpacedRepetitionItemType
from app.repositories.interfaces.base import AbstractRepository

class AbstractSpacedRepetitionRepository(AbstractRepository[SpacedRepetitionItem, uuid.UUID]):
    @abstractmethod
    async def get_by_user_and_item(
        self,
        user_id: uuid.UUID,
        item_type: SpacedRepetitionItemType,
        item_id: uuid.UUID
    ) -> Optional[SpacedRepetitionItem]:
        pass

    @abstractmethod
    async def list_due_items(
        self,
        user_id: uuid.UUID,
        cutoff_datetime: datetime,
        item_type: Optional[SpacedRepetitionItemType] = None,
        limit: int = 20
    ) -> List[SpacedRepetitionItem]:
        pass

    @abstractmethod
    async def count_due_items(
        self,
        user_id: uuid.UUID,
        cutoff_datetime: datetime,
        item_type: Optional[SpacedRepetitionItemType] = None
    ) -> int:
        pass

    @abstractmethod
    async def get_daily_review_counts(self, user_id: uuid.UUID, last_n_days: int = 30) -> List[Tuple[str, int]]:
        pass
