import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tutor import RateLimitStatus
from app.services.interfaces.tutor import AbstractTutorRateLimiter
from app.repositories.user_quota_repository import UserQuotaRepository
from app.repositories.profile_repository import ProfileRepository
from app.services.quota_tracking_service import QuotaTrackingService
from app.services.cache_service import get_cache_service

class TutorRateLimiter(AbstractTutorRateLimiter):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._quota_service = QuotaTrackingService(
            UserQuotaRepository(session),
            ProfileRepository(session),
            get_cache_service()
        )

    async def check_limit(self, user_id: uuid.UUID) -> RateLimitStatus:
        status = await self._quota_service.check_quota(user_id, "tutor_messages")
        allowed = status.remaining > 0
        reset_dt = datetime.fromisoformat(status.reset_at)
        
        return RateLimitStatus(
            allowed=allowed,
            remaining=status.remaining,
            reset_at=reset_dt
        )

    async def increment(self, user_id: uuid.UUID) -> None:
        await self._quota_service.increment_usage(user_id, "tutor_messages", 1)
