import os
import uuid
import logging
from datetime import date, timedelta
from typing import Dict, Any
from sqlalchemy import select
from app.core.database import db_manager
from app.models.user import User
from app.models.user_gamification import UserGamification
from app.repositories.gamification_repository import GamificationRepository
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.services.ai_coach_report_generation_service import AICoachReportGenerationService
from app.services.ai.factory import get_ai_provider
from app.services.ai.prompts import get_prompt_manager

logger = logging.getLogger("weekly_report_job")

async def run_weekly_reports_job() -> Dict[str, Any]:
    """
    Generate weekly reports for active users.
    
    FIXED: Improved session management to avoid exhausting connection pool.
    Fetches all user IDs in a single session, then processes users one by one.
    """
    today = date.today()
    period_end = today - timedelta(days=1)
    period_start = today - timedelta(days=7)
    
    cutoff_date = today - timedelta(days=30)
    
    summary = {
        "total_users_processed": 0,
        "reports_generated": 0,
        "reports_skipped": 0,
        "reports_failed": 0,
        "errors": []
    }
    
    # Fetch user IDs in a single session
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User.id)
            .join(UserGamification)
            .filter(UserGamification.last_activity_date >= cutoff_date)
        )
        user_ids = [row[0] for row in result.all()]
        
    ai_provider = get_ai_provider()
    prompt_manager = get_prompt_manager()
    
    # Process each user with its own session
    for uid in user_ids:
        summary["total_users_processed"] += 1
        async with db_manager.get_session() as session:
            try:
                gamification_repo = GamificationRepository(session)
                weekly_report_repo = WeeklyReportRepository(session)
                
                exists = await weekly_report_repo.exists_for_period(uid, period_start)
                if exists:
                    summary["reports_skipped"] += 1
                    continue
                
                coach_service = AICoachReportGenerationService(
                    session=session,
                    ai_provider=ai_provider,
                    prompt_manager=prompt_manager,
                    gamification_repo=gamification_repo,
                    weekly_report_repo=weekly_report_repo
                )
                
                await coach_service.generate_weekly_report(uid, period_start, period_end)
                await gamification_repo.set_unread_report(uid, True)
                
                await session.commit()
                summary["reports_generated"] += 1
            except Exception as e:
                await session.rollback()
                summary["reports_failed"] += 1
                summary["errors"].append({"user_id": str(uid), "error": str(e)})
                logger.error(f"Failed to generate report for user {uid}: {str(e)}")
                
    logger.info(f"Weekly report job completed: {summary}")
    return summary
