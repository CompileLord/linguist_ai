import uuid
from datetime import datetime
from typing import List, Optional
from app.models.user_error import UserError
from app.schemas.user_error import DetectedError
from app.repositories.user_error_repository import UserErrorRepository
from app.services.error_explanation_service import ErrorExplanationService
from app.models.user_profile import UserProfile

class ErrorAggregationService:
    def __init__(
        self,
        user_error_repo: UserErrorRepository,
        explanation_service: ErrorExplanationService
    ) -> None:
        self._user_error_repo = user_error_repo
        self._explanation_service = explanation_service

    async def record_errors(
        self,
        user_id: uuid.UUID,
        detected_errors: List[DetectedError],
        related_lesson_id: Optional[uuid.UUID],
        profile: UserProfile,
        target_language_name: str
    ) -> List[UserError]:
        recorded = []
        for det in detected_errors:
            existing = await self._user_error_repo.find_matching_error(
                user_id=user_id,
                category=det.category,
                error_text=det.error_text
            )

            if existing:
                existing.occurrence_count += 1
                existing.last_occurred_at = datetime.utcnow()
                if len(det.explanation) > len(existing.explanation):
                    existing.explanation = det.explanation
                await self._user_error_repo.update(existing)
                recorded.append(existing)
            else:
                detailed_explanation = await self._explanation_service.generate_explanation(
                    error_text=det.error_text,
                    correct_text=det.correct_text,
                    category=det.category.value,
                    target_language=target_language_name,
                    cefr_level=profile.current_level,
                    ui_language=profile.native_language_code
                )

                new_error = UserError(
                    user_id=user_id,
                    category=det.category,
                    error_text=det.error_text,
                    correct_text=det.correct_text,
                    explanation=detailed_explanation,
                    related_lesson_id=related_lesson_id,
                    occurrence_count=1
                )
                new_error = await self._user_error_repo.create(new_error)
                recorded.append(new_error)

        return recorded
