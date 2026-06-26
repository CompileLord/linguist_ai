import os
import uuid
from datetime import datetime, timezone, timedelta, time
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from app.models.user import User
from app.models.listening_exam import ListeningExam
from app.schemas.listening_exam import (
    PaginatedListeningExamAvailableResponse,
    ListeningExamAvailableItem,
    ListeningExamDetailsResponse,
    ListeningSubmitRequest,
    ListeningSubmitResponse,
    ListeningTranscriptResponse
)
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_listening_exam_repository,
    get_listening_exam_service,
    get_profile_service,
    get_quota_tracking_service
)
from app.repositories.listening_exam_repository import ListeningExamRepository
from app.services.listening_exam_service import ListeningExamService
from app.services.quota_tracking_service import QuotaTrackingService
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException, ValidationException


router = APIRouter(prefix="/exams/listening", tags=["Listening Exams"])

@router.get("/available", response_model=PaginatedListeningExamAvailableResponse, status_code=status.HTTP_200_OK)
async def list_available_listening_exams(
    language_id: uuid.UUID = Query(...),
    level: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    repo: ListeningExamRepository = Depends(get_listening_exam_repository)
):
    offset = (page - 1) * per_page
    
    exams = await repo.get_available_exams(
        user_id=current_user.id,
        language_id=language_id,
        level=level,
        skip=offset,
        limit=per_page
    )
    
    total = await repo.count_available_exams(current_user.id, language_id, level)

    items = []
    for exam in exams:
        items.append(
            ListeningExamAvailableItem(
                exam_id=exam.id,
                level=exam.level,
                scenario_type=exam.scenario_type,
                question_count=len(exam.questions)
            )
        )
        
    return PaginatedListeningExamAvailableResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/{id}/audio", response_model=ListeningExamDetailsResponse, status_code=status.HTTP_200_OK)
async def get_listening_exam_details(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: ListeningExamService = Depends(get_listening_exam_service)
):
    return await service.get_exam_for_user(current_user.id, id)

@router.post("/{id}/submit", response_model=ListeningSubmitResponse, status_code=status.HTTP_200_OK)
async def submit_listening_exam(
    id: uuid.UUID,
    request_data: ListeningSubmitRequest,
    current_user: User = Depends(get_current_active_user),
    repo: ListeningExamRepository = Depends(get_listening_exam_repository),
    service: ListeningExamService = Depends(get_listening_exam_service),
    quota_service: QuotaTrackingService = Depends(get_quota_tracking_service)
):
    status_item = await quota_service.check_quota(current_user.id, "listening_exam_attempts")
    if status_item.remaining <= 0:
        reset_dt = datetime.fromisoformat(status_item.reset_at)
        now = datetime.now(timezone.utc)
        seconds_until_midnight = int((reset_dt - now).total_seconds())
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Daily listening exam limit reached",
                "daily_limit": status_item.daily_limit,
                "attempts_used": status_item.current_usage,
                "reset_at": status_item.reset_at
            },
            headers={"Retry-After": str(seconds_until_midnight)}
        )

    res = await service.submit_answers(
        user_id=current_user.id,
        exam_id=id,
        answers=request_data.answers
    )
    await quota_service.increment_usage(current_user.id, "listening_exam_attempts", 1)
    return res


@router.get("/{id}/transcript", response_model=ListeningTranscriptResponse, status_code=status.HTTP_200_OK)
async def get_listening_exam_transcript(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    service: ListeningExamService = Depends(get_listening_exam_service)
):
    script_text = await service.get_transcript(current_user.id, id)
    return ListeningTranscriptResponse(script_text=script_text)
