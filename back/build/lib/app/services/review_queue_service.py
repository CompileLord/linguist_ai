import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy import select, func
from app.models.spaced_repetition_item import SpacedRepetitionItem
from app.models.enums import SpacedRepetitionItemType
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.repositories.vocabulary_repository import VocabularyRepository
from app.core.database import db_manager

@dataclass
class QueueStats:
    total_due_count: int
    vocab_due_count: int
    grammar_due_count: int
    next_review_at: Optional[datetime]

class ReviewQueueService:
    def __init__(
        self,
        spaced_repetition_repo: SpacedRepetitionRepository,
        vocabulary_repo: VocabularyRepository
    ) -> None:
        self._spaced_repetition_repo = spaced_repetition_repo
        self._vocabulary_repo = vocabulary_repo

    async def get_review_queue(
        self,
        user_id: uuid.UUID,
        item_type: Optional[SpacedRepetitionItemType] = None,
        batch_size: int = 20
    ) -> List[SpacedRepetitionItem]:
        now = datetime.utcnow()
        items = await self._spaced_repetition_repo.list_due_items(
            user_id=user_id,
            cutoff_datetime=now,
            item_type=item_type,
            limit=batch_size
        )

        vocab_ids = [item.item_id for item in items if item.item_type == SpacedRepetitionItemType.VOCAB]
        
        if vocab_ids:
            async with db_manager.get_session() as session:
                from app.models.vocabulary import Vocabulary
                result = await session.execute(select(Vocabulary).filter(Vocabulary.id.in_(vocab_ids)))
                vocab_lookup = {v.id: v for v in result.scalars().all()}
                for item in items:
                    if item.item_type == SpacedRepetitionItemType.VOCAB:
                        item.detail = vocab_lookup.get(item.item_id)
        
        return items

    async def get_queue_stats(self, user_id: uuid.UUID) -> QueueStats:
        now = datetime.utcnow()
        
        total_due = await self._spaced_repetition_repo.count_due_items(user_id, now)
        vocab_due = await self._spaced_repetition_repo.count_due_items(user_id, now, SpacedRepetitionItemType.VOCAB)
        grammar_due = await self._spaced_repetition_repo.count_due_items(user_id, now, SpacedRepetitionItemType.GRAMMAR)
        
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(SpacedRepetitionItem.next_review_at)
                .filter(SpacedRepetitionItem.user_id == user_id, SpacedRepetitionItem.next_review_at > now)
                .order_by(SpacedRepetitionItem.next_review_at.asc())
                .limit(1)
            )
            next_review = result.scalar_one_or_none()

        return QueueStats(
            total_due_count=total_due,
            vocab_due_count=vocab_due,
            grammar_due_count=grammar_due,
            next_review_at=next_review
        )
