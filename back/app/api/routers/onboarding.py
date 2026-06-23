from typing import List
from fastapi import APIRouter, Depends, status
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import get_profile_service, get_placement_test_service
from app.services.profile_service import ProfileService
from app.services.placement_service import PlacementTestService
from app.schemas.profile import ProfileSetupRequest, ProfileResponse, GoalsUpdateRequest, GoalResponse
from app.schemas.placement import PlacementQuestion, PlacementStepResult, PlacementResult, PlacementAnswerRequest

router = APIRouter(prefix="/profile", tags=["Onboarding"])

@router.post("/setup", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def setup_profile(
    schema: ProfileSetupRequest,
    current_user: User = Depends(get_current_active_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    return await profile_service.setup_profile(current_user.id, schema)

@router.put("/goals", response_model=List[GoalResponse], status_code=status.HTTP_200_OK)
async def update_goals(
    schema: GoalsUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    return await profile_service.update_goals(current_user.id, schema)

@router.get("", response_model=ProfileResponse, status_code=status.HTTP_200_OK)
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    return await profile_service.get_profile(current_user.id)

@router.post("/placement/start", response_model=PlacementQuestion, status_code=status.HTTP_200_OK)
async def start_placement(
    current_user: User = Depends(get_current_active_user),
    placement_service: PlacementTestService = Depends(get_placement_test_service)
):
    return await placement_service.start_placement(current_user.id)

@router.post("/placement/answer", response_model=PlacementStepResult, status_code=status.HTTP_200_OK)
async def process_answer(
    schema: PlacementAnswerRequest,
    current_user: User = Depends(get_current_active_user),
    placement_service: PlacementTestService = Depends(get_placement_test_service)
):
    return await placement_service.process_answer(current_user.id, schema.answer_index)

@router.get("/placement/result", response_model=PlacementResult, status_code=status.HTTP_200_OK)
async def get_placement_result(
    current_user: User = Depends(get_current_active_user),
    placement_service: PlacementTestService = Depends(get_placement_test_service)
):
    return await placement_service.finalize_placement(current_user.id)
