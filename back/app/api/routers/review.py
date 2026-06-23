import uuid
from datetime import datetime, time
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from app.models.user import User
from app.models.enums import SpacedRepetitionItemType
from app.schemas.spaced_repetition import ReviewResponse, SpacedRepetitionItemResponse, ReviewStatsResponse, DailyCountResponse
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_review_queue_service,
    get_spaced_repetition_service,
    get_dashboard_analytics_service,
    get_spaced_repetition_repository
)
from app.services.review_queue_service import ReviewQueueService
from app.services.spaced_repetition_service import SpacedRepetitionService
from app.services.dashboard_analytics_service import DashboardAnalyticsService
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.core.database import db_manager
from app.models.spaced_repetition_item import SpacedRepetitionItem

router = APIRouter(prefix="/review", tags=["Review"])

@router.get("/queue", response_model=List[SpacedRepetitionItemResponse], status_code=status.HTTP_200_OK)
async def get_review_queue(
    item_type: Optional[SpacedRepetitionItemType] = None,
    batch_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    queue_service: ReviewQueueService = Depends(get_review_queue_service)
):
    items = await queue_service.get_review_queue(
        user_id=current_user.id,
        item_type=item_type,
        batch_size=batch_size
    )
    responses = []
    for item in items:
        resp = SpacedRepetitionItemResponse.model_validate(item)
        if hasattr(item, "detail") and item.detail:
            resp.detail = item.detail
        responses.append(resp)
    return responses

@router.post("/{item_id}/respond", response_model=SpacedRepetitionItemResponse, status_code=status.HTTP_200_OK)
async def respond_to_review_item(
    item_id: uuid.UUID,
    outcome: ReviewResponse,
    current_user: User = Depends(get_current_active_user),
    sr_service: SpacedRepetitionService = Depends(get_spaced_repetition_service),
    sr_repo: SpacedRepetitionRepository = Depends(get_spaced_repetition_repository),
    vocab_repo = Depends(get_review_queue_service)
):
    item = await sr_service.respond_to_item(
        user_id=current_user.id,
        item_id=item_id,
        outcome=outcome
    )
    
    resp = SpacedRepetitionItemResponse.model_validate(item)
    if item.item_type == SpacedRepetitionItemType.VOCAB:
        from app.models.vocabulary import Vocabulary
        async with db_manager.get_session() as session:
            res = await session.execute(select(Vocabulary).filter(Vocabulary.id == item.item_id))
            vocab = res.scalar_one_or_none()
            if vocab:
                resp.detail = vocab
    return resp

@router.get("/stats", response_model=ReviewStatsResponse, status_code=status.HTTP_200_OK)
async def get_review_stats(
    current_user: User = Depends(get_current_active_user),
    analytics_service: DashboardAnalyticsService = Depends(get_dashboard_analytics_service),
    sr_repo: SpacedRepetitionRepository = Depends(get_spaced_repetition_repository)
):
    now = datetime.utcnow()
    start_of_today = datetime.combine(now.date(), time.min)

    total_due_today = await sr_repo.count_due_items(current_user.id, now)
    
    async with db_manager.get_session() as session:
        res = await session.execute(
            select(func.count(SpacedRepetitionItem.id))
            .filter(
                SpacedRepetitionItem.user_id == current_user.id,
                SpacedRepetitionItem.last_reviewed_at >= start_of_today
            )
        )
        completed_today = res.scalar() or 0

    analytics = await analytics_service.get_review_analytics(current_user.id, period_days=30)
    
    daily_counts = [
        DailyCountResponse(date=d["date"], count=d["count"]) 
        for d in analytics["daily_counts"]
    ]

    return ReviewStatsResponse(
        total_due_today=total_due_today,
        completed_today=completed_today,
        streak_days=analytics["current_streak_days"],
        daily_counts=daily_counts,
        mastery_distribution=analytics["mastery_distribution"]
    )
