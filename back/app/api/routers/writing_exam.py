import os
import uuid
from datetime import datetime, timezone, timedelta, time
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from app.models.user import User
from app.models.writing_exam import WritingExam
from app.schemas.writing_exam import (
    WritingPromptResponse,
    WritingExamSubmitRequest,
    WritingEvaluationResponse,
    PaginatedWritingExamHistoryResponse,
    WritingExamHistoryItem
)
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_writing_exam_repository,
    get_writing_prompt_generation_service,
    get_writing_evaluation_service,
    get_profile_service,
    get_quota_tracking_service
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.repositories.profile_repository import ProfileRepository
from app.repositories.writing_exam_repository import WritingExamRepository
from app.services.writing_exam_service import WritingPromptGenerationService, WritingEvaluationService
from app.services.quota_tracking_service import QuotaTrackingService
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException, ValidationException

router = APIRouter(prefix="/exams/writing", tags=["Writing Exams"])

@router.get("/prompt", response_model=WritingPromptResponse, status_code=status.HTTP_201_CREATED)
async def generate_writing_prompt(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
    repo: WritingExamRepository = Depends(get_writing_exam_repository),
    prompt_service: WritingPromptGenerationService = Depends(get_writing_prompt_generation_service),
    quota_service: QuotaTrackingService = Depends(get_quota_tracking_service)
):
    status_item = await quota_service.check_quota(current_user.id, "writing_exam_attempts")
    if status_item.remaining <= 0:
        reset_dt = datetime.fromisoformat(status_item.reset_at)
        now = datetime.now(timezone.utc)
        seconds_until_midnight = int((reset_dt - now).total_seconds())
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Daily writing exam limit reached",
                "daily_limit": status_item.daily_limit,
                "attempts_used": status_item.current_usage,
                "reset_at": status_item.reset_at
            },
            headers={"Retry-After": str(seconds_until_midnight)}
        )

    await quota_service.increment_usage(current_user.id, "writing_exam_attempts", 1)


    profile_repo = ProfileRepository(db)
    profile = await profile_repo.get_by_user_id(current_user.id)
    if not profile or not profile.current_level:
        raise ValidationException(detail="User profile or target language level is not set up")

    from app.repositories.goals_repository import GoalsRepository
    goals_repo = GoalsRepository(db)
    user_goals = await goals_repo.get_by_user_id(current_user.id)
    goals = [g.goal_type for g in user_goals]
    
    generated = await prompt_service.generate_prompt(
        target_language=profile.target_language.name,
        level=profile.current_level,
        learning_goals=goals
    )
    
    exam = WritingExam(
        user_id=current_user.id,
        prompt=generated.prompt_text
    )
    exam = await repo.create(exam)
    
    return WritingPromptResponse(
        exam_id=exam.id,
        prompt_text=exam.prompt,
        recommended_word_count=generated.recommended_word_count,
        suggested_time_minutes=generated.suggested_time_minutes
    )

@router.post("/submit", response_model=WritingEvaluationResponse, status_code=status.HTTP_200_OK)
async def submit_writing_exam(
    request_data: WritingExamSubmitRequest,
    current_user: User = Depends(get_current_active_user),
    repo: WritingExamRepository = Depends(get_writing_exam_repository),
    eval_service: WritingEvaluationService = Depends(get_writing_evaluation_service)
):
    exam = await repo.get_by_id(request_data.exam_id)
    if not exam:
        raise NotFoundException(detail="Writing exam not found")
    
    if exam.user_id != current_user.id:
        raise ForbiddenException(detail="You do not own this writing exam")
        
    if exam.submitted_text is not None or exam.overall_score is not None:
        raise ConflictException(detail="Writing exam already submitted and evaluated")
        
    evaluated_exam = await eval_service.evaluate_submission(
        exam_id=request_data.exam_id,
        submitted_text=request_data.submitted_text
    )
    return WritingEvaluationResponse.model_validate(evaluated_exam)

@router.get("/history", response_model=PaginatedWritingExamHistoryResponse, status_code=status.HTTP_200_OK)
async def list_writing_exam_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    repo: WritingExamRepository = Depends(get_writing_exam_repository)
):
    offset = (page - 1) * per_page
    
    history = await repo.get_user_history(
        user_id=current_user.id,
        limit=per_page,
        offset=offset
    )
    
    total = await repo.count_by_user(current_user.id)
        
    items = []
    for exam in history:
        items.append(
            WritingExamHistoryItem(
                exam_id=exam.id,
                prompt_snippet=exam.prompt[:100],
                overall_score=exam.overall_score,
                created_at=exam.created_at
            )
        )
        
    return PaginatedWritingExamHistoryResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page
    )
