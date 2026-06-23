import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.models.user_error import UserError
from app.repositories.user_error_repository import UserErrorRepository

class ErrorSignalService:
    _emitted_signals: List[Dict[str, Any]] = []

    def __init__(self, user_error_repo: UserErrorRepository) -> None:
        self._user_error_repo = user_error_repo

    async def check_and_emit_signals(self, user_id: uuid.UUID, error_threshold: int = 5) -> List[Dict[str, Any]]:
        errors = await self._user_error_repo.list_frequent(
            user_id=user_id,
            min_occurrence_count=error_threshold,
            limit=100
        )
        
        unsignaled_errors = [e for e in errors if e.signaled_at is None]
        new_signals = []

        for err in unsignaled_errors:
            err.signaled_at = datetime.utcnow()
            await self._user_error_repo.update(err)

            suggested_focus = f"Reinforce correct usage of '{err.correct_text}' instead of incorrect '{err.error_text}' in {err.category.value} exercises."
            
            payload = {
                "user_id": user_id,
                "error_id": err.id,
                "error_category": err.category.value,
                "error_text": err.error_text,
                "correct_text": err.correct_text,
                "occurrence_count": err.occurrence_count,
                "suggested_focus": suggested_focus,
                "emitted_at": datetime.utcnow()
            }
            
            self._emitted_signals.append(payload)
            new_signals.append(payload)

        return new_signals

    @classmethod
    def get_emitted_signals(cls, user_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
        if user_id is None:
            return cls._emitted_signals
        return [s for s in cls._emitted_signals if s["user_id"] == user_id]

    @classmethod
    def clear_signals(cls) -> None:
        cls._emitted_signals.clear()
