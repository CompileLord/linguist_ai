from fastapi import APIRouter, Depends, Query, status
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import get_weekly_report_repository, get_gamification_repository
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.repositories.gamification_repository import GamificationRepository
from app.schemas.weekly_report import (
    WeeklyReportResponse,
    WeeklyReportHistoryItem,
    PaginatedWeeklyReportResponse
)
from app.core.exceptions import NotFoundException, ForbiddenException
from sqlalchemy import select, func
from app.core.database import db_manager
from app.models.weekly_report import WeeklyReport

router = APIRouter(prefix="/coach", tags=["AI Coach"])

@router.get("/reports", response_model=PaginatedWeeklyReportResponse)
async def list_weekly_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    repo: WeeklyReportRepository = Depends(get_weekly_report_repository)
):
    offset = (page - 1) * per_page
    reports = await repo.list_by_user(current_user.id, limit=per_page, offset=offset)
    
    async with db_manager.get_session() as session:
        res = await session.execute(
            select(func.count(WeeklyReport.id)).filter(WeeklyReport.user_id == current_user.id)
        )
        total = res.scalar() or 0
        
    items = [
        WeeklyReportHistoryItem(
            id=r.id,
            period_start=r.period_start,
            period_end=r.period_end,
            generated_at=r.generated_at,
            strengths_preview=r.strengths[:150]
        )
        for r in reports
    ]
    
    return PaginatedWeeklyReportResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/reports/latest", response_model=WeeklyReportResponse)
async def get_latest_report(
    current_user: User = Depends(get_current_active_user),
    repo: WeeklyReportRepository = Depends(get_weekly_report_repository),
    gamification_repo: GamificationRepository = Depends(get_gamification_repository)
):
    report = await repo.get_latest(current_user.id)
    if not report:
        raise NotFoundException(detail="No weekly coaching reports found for user")
        
    try:
        await gamification_repo.set_unread_report(current_user.id, False)
    except Exception:
        pass
        
    return WeeklyReportResponse.model_validate(report)

admin_router = APIRouter(prefix="/admin/coach", tags=["Admin Coach"])

@admin_router.post("/generate-reports")
async def trigger_reports_generation(
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_superuser:
        raise ForbiddenException(detail="Only admin users can trigger weekly reports generation")
        
    from app.services.weekly_report_scheduler import run_weekly_reports_job
    summary = await run_weekly_reports_job()
    return summary

