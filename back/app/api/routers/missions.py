import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from app.models.user import User
from app.schemas.mission import MissionResponse, UserMissionAttemptResponse
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_mission_repository,
    get_mission_attempt_repository,
    get_mission_service,
    get_profile_service
)
from app.repositories.mission_repository import MissionRepository, MissionAttemptRepository
from app.services.mission_service import MissionService
from app.services.profile_service import ProfileService
from app.core.exceptions import MissionNotFoundError, ConflictException

router = APIRouter(prefix="/missions", tags=["Missions"])

class CompleteMissionRequest(BaseModel):
    attempt_id: uuid.UUID

@router.get("", response_model=List[MissionResponse])
async def list_missions(
    related_goal: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    profile_service: ProfileService = Depends(get_profile_service),
    mission_repo: MissionRepository = Depends(get_mission_repository),
    attempt_repo: MissionAttemptRepository = Depends(get_mission_attempt_repository)
):
    profile = await profile_service.get_profile(current_user.id)
    user_level = profile.current_level.value if profile.current_level else "A1"
    
    skip = (page - 1) * per_page
    missions = await mission_repo.list_available(
        cefr_level=user_level,
        related_goal=related_goal,
        skip=skip,
        limit=per_page
    )
    
    result = []
    for m in missions:
        attempts = await attempt_repo.list_by_user(current_user.id, mission_id=m.id, status="completed")
        completed = len(attempts) > 0
        best_score = max([a.score for a in attempts if a.score is not None]) if completed else None
        
        result.append(
            MissionResponse(
                id=m.id,
                title=m.title,
                description=m.description,
                scenario_prompt=m.scenario_prompt,
                related_goal=m.related_goal,
                cefr_level_min=m.cefr_level_min.value if hasattr(m.cefr_level_min, "value") else m.cefr_level_min,
                estimated_duration_minutes=m.estimated_duration_minutes,
                difficulty_rating=m.difficulty_rating,
                is_active=m.is_active,
                completed_before=completed,
                best_score=best_score
            )
        )
    return result

@router.post("/{id}/start")
async def start_mission(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    mission_service: MissionService = Depends(get_mission_service),
    attempt_repo: MissionAttemptRepository = Depends(get_mission_attempt_repository)
):
    active_attempts = await attempt_repo.list_by_user(current_user.id, mission_id=id, status="in_progress")
    if active_attempts:
        raise ConflictException(detail="An attempt is already in progress for this mission")
        
    session_id, attempt_id = await mission_service.start_mission(current_user.id, id)
    return {
        "attempt_id": attempt_id,
        "session_id": session_id
    }

@router.post("/{id}/complete", response_model=UserMissionAttemptResponse)
async def complete_mission(
    id: uuid.UUID,
    req_body: CompleteMissionRequest,
    current_user: User = Depends(get_current_active_user),
    mission_service: MissionService = Depends(get_mission_service)
):
    attempt = await mission_service.complete_mission(req_body.attempt_id)
    return UserMissionAttemptResponse.model_validate(attempt)

@router.get("/{id}/attempts", response_model=List[UserMissionAttemptResponse])
async def list_mission_attempts(
    id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    attempt_repo: MissionAttemptRepository = Depends(get_mission_attempt_repository)
):
    skip = (page - 1) * per_page
    attempts = await attempt_repo.list_by_user(
        user_id=current_user.id,
        mission_id=id,
        skip=skip,
        limit=per_page
    )
    return [UserMissionAttemptResponse.model_validate(a) for a in attempts]
