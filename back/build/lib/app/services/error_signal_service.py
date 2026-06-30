import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.models.user_error import UserError
from app.repositories.user_error_repository import UserErrorRepository

class ErrorSignalService:
    """
    Service for managing error signals.
    
    FIXED: Removed class-level _emitted_signals to avoid in-memory state
    that breaks in multi-worker deployments. Signals are now persisted
    directly to the database via the signaled_at field.
    """

    def __init__(self, user_error_repo: UserErrorRepository) -> None:
        self._user_error_repo = user_error_repo

    async def check_and_emit_signals(self, user_id: uuid.UUID, error_threshold: int = 5) -> List[Dict[str, Any]]:
        """
        Check for frequent errors and emit signals.
        
        Signals are persisted to database via signaled_at field.
        Returns new signals emitted in this call.
        """
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
                "emitted_at": err.signaled_at
            }
            
            new_signals.append(payload)

        return new_signals

    async def get_emitted_signals(self, user_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
        """
        Retrieve emitted signals from the database.
        
        Args:
            user_id: Filter by user ID, or None for all users
            
        Returns:
            List of signal payloads
        """
        # Query errors that have been signaled
        errors = await self._user_error_repo.list_frequent(
            user_id=user_id,
            min_occurrence_count=1,
            limit=1000
        )
        
        signaled_errors = [e for e in errors if e.signaled_at is not None]
        
        signals = []
        for err in signaled_errors:
            suggested_focus = f"Reinforce correct usage of '{err.correct_text}' instead of incorrect '{err.error_text}' in {err.category.value} exercises."
            
            payload = {
                "user_id": err.user_id,
                "error_id": err.id,
                "error_category": err.category.value,
                "error_text": err.error_text,
                "correct_text": err.correct_text,
                "occurrence_count": err.occurrence_count,
                "suggested_focus": suggested_focus,
                "emitted_at": err.signaled_at
            }
            signals.append(payload)
        
        return signals
