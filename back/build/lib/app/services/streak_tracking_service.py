import uuid
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from app.repositories.interfaces.gamification import AbstractGamificationRepository
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.models.user_gamification import UserGamification

class StreakTrackingService:
    def __init__(
        self,
        gamification_repo: AbstractGamificationRepository,
        profile_repo: AbstractProfileRepository
    ) -> None:
        self.gamification_repo = gamification_repo
        self.profile_repo = profile_repo

    async def record_activity(self, user_id: uuid.UUID) -> UserGamification:
        gamification = await self.gamification_repo.get_by_user_id(user_id)
        profile = await self.profile_repo.get_by_user_id(user_id)
        
        tz_str = getattr(profile, "timezone", "UTC") or "UTC"
        user_tz = ZoneInfo(tz_str)
        user_today = datetime.now(user_tz).date()
        
        last_date = gamification.last_activity_date
        
        if last_date is None:
            new_streak = 1
            longest = max(gamification.longest_streak, new_streak)
            return await self.gamification_repo.update_streak(
                user_id=user_id,
                current_streak=new_streak,
                longest_streak=longest,
                last_activity_date=user_today
            )
        
        if last_date == user_today:
            return gamification
        
        if last_date == user_today - timedelta(days=1):
            new_streak = gamification.current_streak + 1
            longest = max(gamification.longest_streak, new_streak)
            return await self.gamification_repo.update_streak(
                user_id=user_id,
                current_streak=new_streak,
                longest_streak=longest,
                last_activity_date=user_today
            )
        
        new_streak = 1
        longest = max(gamification.longest_streak, new_streak)
        return await self.gamification_repo.update_streak(
            user_id=user_id,
            current_streak=new_streak,
            longest_streak=longest,
            last_activity_date=user_today
        )
