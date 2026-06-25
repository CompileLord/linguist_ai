from fastapi import APIRouter, Depends, status
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import get_quota_tracking_service
from app.services.quota_tracking_service import QuotaTrackingService
from app.schemas.quota import UserQuotaStatusResponse, QuotaStatusItem

router = APIRouter(prefix="/quota", tags=["Quota Tracking"])

@router.get("/status", response_model=UserQuotaStatusResponse)
async def get_quota_status(
    current_user: User = Depends(get_current_active_user),
    service: QuotaTrackingService = Depends(get_quota_tracking_service)
):
    functions = [
        "speaking_minutes",
        "tutor_messages",
        "lesson_generations",
        "writing_exam_attempts",
        "listening_exam_attempts",
        "mission_attempts"
    ]
    
    items = []
    for fn in functions:
        status_item = await service.check_quota(current_user.id, fn)
        items.append(
            QuotaStatusItem(
                function_name=fn,
                daily_limit=status_item.daily_limit,
                current_usage=status_item.current_usage,
                remaining=status_item.remaining,
                reset_at=status_item.reset_at
            )
        )
        
    items.sort(key=lambda x: x.function_name)
    return UserQuotaStatusResponse(quotas=items)
