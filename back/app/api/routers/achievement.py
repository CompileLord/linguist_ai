from fastapi import APIRouter, Depends, Query, status
from typing import List
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import get_achievement_repository
from app.repositories.achievement_repository import AchievementRepository
from app.schemas.achievement import AchievementResponse, UserAchievementResponse

router = APIRouter(prefix="/achievements", tags=["Achievements"])

@router.get("/all", response_model=List[AchievementResponse])
async def get_all_achievements(
    current_user: User = Depends(get_current_active_user),
    repo: AchievementRepository = Depends(get_achievement_repository)
):
    all_ach = await repo.get_all_achievements()
    user_ach = await repo.get_user_achievements(current_user.id)
    unlocked_ids = {ua.achievement_id for ua in user_ach}
    
    response = []
    for ach in all_ach:
        response.append(
            AchievementResponse(
                id=ach.id,
                code=ach.code,
                title=ach.title,
                description=ach.description,
                condition_type=ach.condition_type.value,
                condition_value=ach.condition_value,
                is_unlocked=ach.id in unlocked_ids
            )
        )
    return response

@router.get("/user", response_model=List[UserAchievementResponse])
async def get_user_achievements(
    current_user: User = Depends(get_current_active_user),
    repo: AchievementRepository = Depends(get_achievement_repository)
):
    user_ach = await repo.get_user_achievements(current_user.id)
    return [
        UserAchievementResponse(
            achievement_id=ua.achievement_id,
            code=ua.achievement.code,
            title=ua.achievement.title,
            description=ua.achievement.description,
            unlocked_at=ua.unlocked_at
        )
        for ua in user_ach
    ]

@router.get("/recent", response_model=List[UserAchievementResponse])
async def get_recent_achievements(
    days: int = Query(7, ge=1),
    current_user: User = Depends(get_current_active_user),
    repo: AchievementRepository = Depends(get_achievement_repository)
):
    user_ach = await repo.get_recent(current_user.id, days=days)
    return [
        UserAchievementResponse(
            achievement_id=ua.achievement_id,
            code=ua.achievement.code,
            title=ua.achievement.title,
            description=ua.achievement.description,
            unlocked_at=ua.unlocked_at
        )
        for ua in user_ach
    ]
