import uuid
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_daily_usage import UserDailyUsage
from app.schemas.tutor import RateLimitStatus
from app.services.interfaces.tutor import AbstractTutorRateLimiter

class TutorRateLimiter(AbstractTutorRateLimiter):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self.daily_limit = 50

    async def check_limit(self, user_id: uuid.UUID) -> RateLimitStatus:
        current_date = datetime.now(timezone.utc).date()
        stmt = select(UserDailyUsage).filter(
            and_(
                UserDailyUsage.user_id == user_id,
                UserDailyUsage.activity_date == current_date
            )
        )
        result = await self._session.execute(stmt)
        usage = result.scalar_one_or_none()
        
        current_usage = usage.message_count if usage else 0
        remaining = max(0, self.daily_limit - current_usage)
        allowed = remaining > 0
        
        next_day = current_date + timedelta(days=1)
        reset_at = datetime.combine(next_day, time.min, tzinfo=timezone.utc)
        
        return RateLimitStatus(
            allowed=allowed,
            remaining=remaining,
            reset_at=reset_at
        )

    async def increment(self, user_id: uuid.UUID) -> None:
        current_date = datetime.now(timezone.utc).date()
        stmt = select(UserDailyUsage).filter(
            and_(
                UserDailyUsage.user_id == user_id,
                UserDailyUsage.activity_date == current_date
            )
        )
        result = await self._session.execute(stmt)
        usage = result.scalar_one_or_none()
        
        if not usage:
            usage = UserDailyUsage(
                user_id=user_id,
                activity_date=current_date,
                message_count=1
            )
            self._session.add(usage)
        else:
            usage.message_count += 1
            self._session.add(usage)
            
        await self._session.flush()
