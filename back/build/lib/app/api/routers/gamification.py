from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_gamification_repository,
    get_xp_calculation_service,
    get_streak_tracking_service,
    get_game_level_progression_service
)
from app.schemas.gamification import GamificationStatsResponse, RecordActivityRequest
from app.core.exceptions import NotFoundException, ForbiddenException
from app.repositories.gamification_repository import GamificationRepository
from app.services.xp_calculation_service import XPCalculationService, ActionType
from app.services.streak_tracking_service import StreakTrackingService
from app.services.game_level_progression_service import GameLevelProgressionService

router = APIRouter(prefix="/gamification", tags=["Gamification"])

# --- Schema for the aggregated progress stats endpoint ---
class ProgressBadge(BaseModel):
    id: str
    code: str
    title: str
    description: str
    icon: str
    icon_color: str
    unlocked_at: Optional[datetime] = None

class ProgressCoachReport(BaseModel):
    id: str
    period_start: str
    period_end: str
    strengths: str
    weaknesses: str
    recommendations: str

class ProgressStatsResponse(BaseModel):
    total_xp: int
    current_streak: int
    current_game_level: int
    words_learned: int
    cefr_level: str
    recent_badges: List[ProgressBadge]
    recent_reports: List[ProgressCoachReport]

progress_router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("/stats", response_model=GamificationStatsResponse)
async def get_gamification_stats(
    current_user: User = Depends(get_current_active_user),
    repo: GamificationRepository = Depends(get_gamification_repository),
    level_service: GameLevelProgressionService = Depends(get_game_level_progression_service)
):
    try:
        gamification = await repo.get_by_user_id(current_user.id)
    except NotFoundException:
        raise NotFoundException(detail="Gamification stats not found for user")
        
    progress = level_service.get_progress(gamification)
    return GamificationStatsResponse(
        total_xp=gamification.total_xp,
        current_game_level=gamification.current_game_level,
        current_streak=gamification.current_streak,
        longest_streak=gamification.longest_streak,
        last_activity_date=gamification.last_activity_date,
        xp_for_next_level=progress["xp_for_next_level"],
        xp_remaining_for_next_level=progress["xp_remaining"],
        level_progress_percentage=progress["progress_percentage"],
        has_unread_report=gamification.has_unread_report
    )

@router.post("/record-activity", response_model=GamificationStatsResponse)
async def record_activity(
    request: RecordActivityRequest,
    current_user: User = Depends(get_current_active_user),
    repo: GamificationRepository = Depends(get_gamification_repository),
    xp_service: XPCalculationService = Depends(get_xp_calculation_service),
    streak_service: StreakTrackingService = Depends(get_streak_tracking_service),
    level_service: GameLevelProgressionService = Depends(get_game_level_progression_service)
):
    if not current_user.is_superuser:
        raise ForbiddenException(detail="Only admin users can record activities manually")
        
    action_type = ActionType(request.action_type)
    xp_to_award = xp_service.calculate_xp(action_type, request.score)
    
    gamification = await repo.add_xp(current_user.id, xp_to_award)
    gamification = await streak_service.record_activity(current_user.id)
    gamification = await level_service.check_and_apply_level_up(current_user.id)
    
    progress = level_service.get_progress(gamification)
    return GamificationStatsResponse(
        total_xp=gamification.total_xp,
        current_game_level=gamification.current_game_level,
        current_streak=gamification.current_streak,
        longest_streak=gamification.longest_streak,
        last_activity_date=gamification.last_activity_date,
        xp_for_next_level=progress["xp_for_next_level"],
        xp_remaining_for_next_level=progress["xp_remaining"],
        level_progress_percentage=progress["progress_percentage"],
        has_unread_report=gamification.has_unread_report
    )


@progress_router.get("/stats", response_model=ProgressStatsResponse)
async def get_progress_stats(
    current_user: User = Depends(get_current_active_user),
    gamification_repo: GamificationRepository = Depends(get_gamification_repository),
    level_service: GameLevelProgressionService = Depends(get_game_level_progression_service),
):
    """Aggregated stats endpoint consumed by the frontend progress page."""
    from sqlalchemy import select, func
    from app.core.database import db_manager
    from app.models.user_vocabulary import UserVocabulary
    from app.models.user_achievement import UserAchievement
    from app.models.achievement import Achievement
    from app.models.weekly_report import WeeklyReport
    from app.models.user_profile import UserProfile

    try:
        gamification = await gamification_repo.get_by_user_id(current_user.id)
    except NotFoundException:
        raise NotFoundException(detail="Gamification stats not found for user")

    async with db_manager.get_session() as session:
        # words learned count
        words_res = await session.execute(
            select(func.count(UserVocabulary.id))
            .filter(UserVocabulary.user_id == current_user.id)
        )
        words_learned = words_res.scalar() or 0

        # CEFR level from profile
        profile_res = await session.execute(
            select(UserProfile).filter(UserProfile.user_id == current_user.id)
        )
        profile = profile_res.scalar_one_or_none()
        cefr_level = profile.current_level.value if profile and profile.current_level else "A1"

        # Recent achievements (last 5)
        ach_res = await session.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.id)
            .filter(UserAchievement.user_id == current_user.id)
            .order_by(UserAchievement.unlocked_at.desc())
            .limit(5)
        )
        recent_badges = [
            ProgressBadge(
                id=str(ua.achievement_id),
                code=ach.code,
                title=ach.title,
                description=ach.description,
                icon="workspace_premium",
                icon_color="text-primary",
                unlocked_at=ua.unlocked_at,
            )
            for ua, ach in ach_res.all()
        ]

        # Recent coach reports (last 3)
        reports_res = await session.execute(
            select(WeeklyReport)
            .filter(WeeklyReport.user_id == current_user.id)
            .order_by(WeeklyReport.generated_at.desc())
            .limit(3)
        )
        recent_reports = [
            ProgressCoachReport(
                id=str(r.id),
                period_start=str(r.period_start),
                period_end=str(r.period_end),
                strengths=r.strengths,
                weaknesses=r.weaknesses,
                recommendations=r.recommendations,
            )
            for r in reports_res.scalars().all()
        ]

    return ProgressStatsResponse(
        total_xp=gamification.total_xp,
        current_streak=gamification.current_streak,
        current_game_level=gamification.current_game_level,
        words_learned=words_learned,
        cefr_level=cefr_level,
        recent_badges=recent_badges,
        recent_reports=recent_reports,
    )
