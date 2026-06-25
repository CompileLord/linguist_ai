import os
import time
import uuid
from datetime import datetime, date, timedelta, time as datetime_time, timezone
from zoneinfo import ZoneInfo
from typing import Dict, Any, List
from sqlalchemy import select
from app.models.user_quota import UserQuota
from app.repositories.interfaces.user_quota import AbstractUserQuotaRepository
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.core.exceptions import QuotaExceededException

class QuotaStatus:
    def __init__(self, daily_limit: int, current_usage: int, remaining: int, reset_at: str) -> None:
        self.daily_limit = daily_limit
        self.current_usage = current_usage
        self.remaining = remaining
        self.reset_at = reset_at

class QuotaTrackingService:
    _cache: Dict[str, int] = {}
    _cache_time: float = 0.0

    def __init__(
        self,
        quota_repo: AbstractUserQuotaRepository,
        profile_repo: AbstractProfileRepository
    ) -> None:
        self.quota_repo = quota_repo
        self.profile_repo = profile_repo

    def _get_limit(self, function_name: str) -> int:
        now = time.time()
        ttl = int(os.getenv("QUOTA_CONFIG_CACHE_TTL_SECONDS", 300))
        
        if now - self.__class__._cache_time > ttl or not self.__class__._cache:
            defaults = {
                "speaking_minutes": 30,
                "tutor_messages": 50,
                "lesson_generations": 5,
                "writing_exam_attempts": 3,
                "listening_exam_attempts": 5,
                "mission_attempts": 10
            }
            resolved = {}
            for k, default_val in defaults.items():
                env_key = f"QUOTA_{k.upper()}_DAILY_LIMIT"
                val = os.getenv(env_key)
                if val is not None:
                    try:
                        resolved[k] = int(val)
                    except ValueError:
                        resolved[k] = default_val
                else:
                    resolved[k] = default_val
            self.__class__._cache = resolved
            self.__class__._cache_time = now
            
        return self.__class__._cache.get(function_name, 0)

    async def check_quota(self, user_id: uuid.UUID, function_name: str) -> QuotaStatus:
        limit = self._get_limit(function_name)
        
        profile = await self.profile_repo.get_by_user_id(user_id)
        tz_str = getattr(profile, "timezone", "UTC") or "UTC"
        user_tz = ZoneInfo(tz_str)
        
        now_user = datetime.now(user_tz)
        today_user = now_user.date()
        
        quota = await self.quota_repo.get_by_user_and_function(user_id, function_name)
        if not quota:
            quota = UserQuota(
                user_id=user_id,
                function_name=function_name,
                daily_limit=limit,
                current_usage=0,
                last_reset_date=today_user
            )
            quota = await self.quota_repo.create(quota)
        else:
            if quota.last_reset_date < today_user:
                quota = await self.quota_repo.reset_quota(user_id, function_name, limit, today_user)
                
        remaining = max(0, quota.daily_limit - quota.current_usage)
        next_midnight = datetime.combine(today_user + timedelta(days=1), datetime_time.min, tzinfo=user_tz)
        
        return QuotaStatus(
            daily_limit=quota.daily_limit,
            current_usage=quota.current_usage,
            remaining=remaining,
            reset_at=next_midnight.isoformat()
        )

    async def increment_usage(self, user_id: uuid.UUID, function_name: str, delta: int = 1) -> int:
        status = await self.check_quota(user_id, function_name)
        if status.remaining < delta:
            raise QuotaExceededException(
                detail=f"Daily limit of {status.daily_limit} reached for {function_name}",
                error_code="QUOTA_EXCEEDED"
            )
        return await self.quota_repo.increment_usage(user_id, function_name, delta)

    async def run_daily_cleanup_job(self) -> dict:
        today_utc = datetime.now(timezone.utc).date()
        total_reset = 0
        
        while True:
            result = await self.quota_repo._session.execute(
                select(UserQuota)
                .filter(UserQuota.last_reset_date < today_utc)
                .limit(100)
            )
            records = list(result.scalars().all())
            if not records:
                break
                
            for r in records:
                r.current_usage = 0
                r.last_reset_date = today_utc
                limit = self._get_limit(r.function_name)
                r.daily_limit = limit
                self.quota_repo._session.add(r)
                
            await self.quota_repo._session.commit()
            total_reset += len(records)
            
        return {
            "total_records_reset": total_reset
        }
