import os
import time
import uuid
from datetime import datetime, date, timedelta, time as datetime_time, timezone
from zoneinfo import ZoneInfo
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.user_quota import UserQuota
from app.repositories.interfaces.user_quota import AbstractUserQuotaRepository
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.core.exceptions import QuotaExceededException
from app.services.interfaces.cache import AbstractCacheService

class QuotaStatus:
    def __init__(self, daily_limit: int, current_usage: int, remaining: int, reset_at: str) -> None:
        self.daily_limit = daily_limit
        self.current_usage = current_usage
        self.remaining = remaining
        self.reset_at = reset_at

class QuotaTrackingService:
    """
    Service for tracking and enforcing quota limits.
    
    FIXED: Removed class-level _cache to avoid in-memory state issues.
    Configuration caching now uses distributed cache service.
    Race conditions in quota creation are handled with proper error handling.
    """

    def __init__(
        self,
        quota_repo: AbstractUserQuotaRepository,
        profile_repo: AbstractProfileRepository,
        cache_service: AbstractCacheService
    ) -> None:
        self.quota_repo = quota_repo
        self.profile_repo = profile_repo
        self._cache_service = cache_service

    async def _get_limit(self, function_name: str) -> int:
        """
        Get quota limit for a function, with distributed caching.
        """
        cache_key = f"quota_limit:{function_name}"
        
        # Try cache first
        cached_value = await self._cache_service.get(cache_key)
        if cached_value is not None:
            try:
                return int(cached_value)
            except ValueError:
                pass
        
        # Load from environment with defaults
        defaults = {
            "speaking_minutes": 30,
            "tutor_messages": 50,
            "lesson_generations": 5,
            "writing_exam_attempts": 3,
            "listening_exam_attempts": 5,
            "mission_attempts": 10
        }
        
        default_val = defaults.get(function_name, 0)
        env_key = f"QUOTA_{function_name.upper()}_DAILY_LIMIT"
        val = os.getenv(env_key)
        
        if val is not None:
            try:
                resolved = int(val)
            except ValueError:
                resolved = default_val
        else:
            resolved = default_val
        
        # Cache for 5 minutes
        ttl = int(os.getenv("QUOTA_CONFIG_CACHE_TTL_SECONDS", 300))
        await self._cache_service.set(cache_key, str(resolved), ttl_seconds=ttl)
        
        return resolved

    async def check_quota(self, user_id: uuid.UUID, function_name: str) -> QuotaStatus:
        """
        Check quota status for a user and function.
        
        FIXED: Handles race condition in quota creation with proper error handling.
        """
        limit = await self._get_limit(function_name)
        
        profile = await self.profile_repo.get_by_user_id(user_id)
        tz_str = getattr(profile, "timezone", "UTC") or "UTC"
        user_tz = ZoneInfo(tz_str)
        
        now_user = datetime.now(user_tz)
        today_user = now_user.date()
        
        quota = await self.quota_repo.get_by_user_and_function(user_id, function_name)
        
        if not quota:
            # Try to create quota, handling potential race condition using a savepoint
            try:
                async with self.quota_repo._session.begin_nested():
                    quota = UserQuota(
                        user_id=user_id,
                        function_name=function_name,
                        daily_limit=limit,
                        current_usage=0,
                        last_reset_date=today_user
                    )
                    quota = await self.quota_repo.create(quota)
            except IntegrityError:
                # Another request created it concurrently, fetch it after savepoint rollback
                quota = await self.quota_repo.get_by_user_and_function(user_id, function_name)
                if not quota:
                    # This should not happen, but handle gracefully
                    raise Exception(f"Failed to create or retrieve quota for user {user_id}, function {function_name}")
        else:
            # Check if reset is needed
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
        """
        Run daily cleanup job to reset quotas.
        
        Processes records in batches to avoid exhausting connection pool.
        """
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
                limit = await self._get_limit(r.function_name)
                r.daily_limit = limit
                self.quota_repo._session.add(r)
                
            await self.quota_repo._session.commit()
            total_reset += len(records)
            
        return {
            "total_records_reset": total_reset
        }
