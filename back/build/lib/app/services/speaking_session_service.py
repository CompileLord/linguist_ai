import uuid
import time
from app.services.quota_tracking_service import QuotaTrackingService
from app.core.exceptions import QuotaExceededException

class SpeakingSessionService:
    def __init__(self, quota_service: QuotaTrackingService) -> None:
        self.quota_service = quota_service
        self._session_starts = {}

    async def start_speaking_session(self, user_id: uuid.UUID) -> str:
        status = await self.quota_service.check_quota(user_id, "speaking_minutes")
        if status.remaining <= 0:
            raise QuotaExceededException(
                detail="Daily speaking quota exceeded",
                error_code="SPEAKING_QUOTA_EXCEEDED"
            )
        
        session_id = str(uuid.uuid4())
        self._session_starts[session_id] = (user_id, time.time())
        return session_id

    async def complete_speaking_session(self, session_id: str) -> int:
        if session_id not in self._session_starts:
            return 0
            
        user_id, start_time = self._session_starts.pop(session_id)
        duration_seconds = time.time() - start_time
        duration_minutes = max(1, int(duration_seconds / 60))
        
        await self.quota_service.increment_usage(user_id, "speaking_minutes", duration_minutes)
        return duration_minutes
