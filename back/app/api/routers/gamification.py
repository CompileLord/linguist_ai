from fastapi import APIRouter, Depends, status, HTTPException
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
