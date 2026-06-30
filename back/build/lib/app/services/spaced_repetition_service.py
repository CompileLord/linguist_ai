import uuid
from datetime import datetime
from app.models.spaced_repetition_item import SpacedRepetitionItem
from app.models.enums import SpacedRepetitionItemType
from app.schemas.spaced_repetition import ReviewResponse
from app.core.exceptions import ItemNotFoundError, ForbiddenException
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.repositories.user_vocabulary_repository import UserVocabularyRepository
from app.services.sm2_service import SM2AlgorithmService

class SpacedRepetitionService:
    def __init__(
        self,
        spaced_repetition_repo: SpacedRepetitionRepository,
        user_vocabulary_repo: UserVocabularyRepository,
        sm2_algorithm: SM2AlgorithmService
    ) -> None:
        self._spaced_repetition_repo = spaced_repetition_repo
        self._user_vocabulary_repo = user_vocabulary_repo
        self._sm2_algorithm = sm2_algorithm

    async def respond_to_item(
        self,
        user_id: uuid.UUID,
        item_id: uuid.UUID,
        outcome: ReviewResponse
    ) -> SpacedRepetitionItem:
        item = await self._spaced_repetition_repo.get_by_id(item_id)
        if not item:
            raise ItemNotFoundError(f"Spaced repetition item {item_id} not found")

        if item.user_id != user_id:
            raise ForbiddenException("You do not own this review item")

        result = self._sm2_algorithm.calculate_next_review(
            current_ease_factor=item.ease_factor,
            current_interval_days=item.interval_days,
            repetition_number=item.repetition_number,
            quality=outcome.quality
        )

        item.ease_factor = result.new_ease_factor
        item.interval_days = result.new_interval_days
        item.repetition_number = result.new_repetition_number
        item.mastery_percent = result.new_mastery_percent
        item.next_review_at = result.next_review_date
        item.last_reviewed_at = datetime.utcnow()

        await self._spaced_repetition_repo.update(item)

        if item.item_type == SpacedRepetitionItemType.VOCAB:
            user_vocab = await self._user_vocabulary_repo.get_by_user_and_vocab(user_id, item.item_id)
            if user_vocab:
                user_vocab.repetitions_count += 1
                if outcome.quality < 3:
                    user_vocab.errors_count += 1
                user_vocab.is_known = outcome.quality >= 3
                user_vocab.last_reviewed_at = datetime.utcnow()
                await self._user_vocabulary_repo.update(user_vocab)

        return item
