import uuid
from datetime import date, datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.weekly_report import WeeklyReport
from app.models.user_achievement import UserAchievement
from app.repositories.gamification_repository import GamificationRepository
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.services.user_activity_aggregation_service import UserActivityAggregationService
from app.services.ai.base import AbstractAIProvider, GenerationConfig
from app.services.ai.prompts import PromptManager
from app.schemas.weekly_report import AICoachReportAI
from app.core.exceptions import ValidationException

class AICoachReportGenerationService:
    def __init__(
        self,
        session: AsyncSession,
        ai_provider: AbstractAIProvider,
        prompt_manager: PromptManager,
        gamification_repo: GamificationRepository,
        weekly_report_repo: WeeklyReportRepository
    ) -> None:
        self.session = session
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self.gamification_repo = gamification_repo
        self.weekly_report_repo = weekly_report_repo

    async def generate_weekly_report(
        self,
        user_id: uuid.UUID,
        period_start: date,
        period_end: date
    ) -> WeeklyReport:
        agg_service = UserActivityAggregationService(self.session, self.gamification_repo)
        summary = await agg_service.aggregate_activity(user_id, period_start, period_end)
        
        total_activities = (
            summary.lessons_completed +
            summary.exercises.attempted +
            summary.writing_exams.count +
            summary.listening_exams.count +
            summary.vocabulary.words_reviewed +
            summary.speaking.sessions
        )
        
        is_low_activity = total_activities < 2
        
        if is_low_activity:
            gamification = await self.gamification_repo.get_by_user_id(user_id)
            ach_res = await self.session.execute(
                select(func.count(UserAchievement.id)).filter(UserAchievement.user_id == user_id)
            )
            ach_count = ach_res.scalar() or 0
            
            prompt_text = self._prompt_manager.render(
                "coach/motivational_report",
                total_xp=str(gamification.total_xp),
                current_level=str(gamification.current_game_level),
                longest_streak=str(gamification.longest_streak),
                total_achievements=str(ach_count)
            )
        else:
            prompt_text = self._prompt_manager.render(
                "coach/weekly_report",
                lessons_completed=str(summary.lessons_completed),
                topics=", ".join(summary.topics) if summary.topics else "None",
                exercises=f"Attempted: {summary.exercises.attempted}, Passed: {summary.exercises.passed}, Failed: {summary.exercises.failed}, Pass Rate: {summary.exercises.pass_rate:.1f}%",
                writing_exams=f"Count: {summary.writing_exams.count}, Avg Score: {summary.writing_exams.average_score:.1f}, Trend: {summary.writing_exams.score_trend:+.1f}",
                listening_exams=f"Count: {summary.listening_exams.count}, Avg Score: {summary.listening_exams.average_score:.1f}, Trend: {summary.listening_exams.score_trend:+.1f}",
                vocabulary=f"Reviewed: {summary.vocabulary.words_reviewed}, Retention Rate: {summary.vocabulary.retention_rate:.1f}%",
                speaking=f"Sessions: {summary.speaking.sessions}, Minutes: {summary.speaking.total_minutes}",
                streak=f"Current: {summary.streak.current}, Days Active: {summary.streak.change_during_period}",
                xp_earned=str(summary.xp_earned)
            )
            
        config = GenerationConfig(model="gemini-2.5-pro")
        report_data = None
        
        for attempt in range(2):
            try:
                report_data = await self._ai_provider.generate_structured(
                    prompt=prompt_text,
                    response_schema=AICoachReportAI,
                    config=config
                )
                if len(report_data.strengths) >= 100 and len(report_data.weaknesses) >= 80 and len(report_data.recommendations) >= 150:
                    break
                else:
                    if attempt == 0:
                        prompt_text += "\n\nIMPORTANT: Please ensure your response strictly exceeds the character minimums:\n- strengths: at least 100 characters\n- weaknesses: at least 80 characters\n- recommendations: at least 150 characters."
                    else:
                        raise ValidationException(
                            detail="AI coach report failed length validation after retry",
                            error_code="COACH_REPORT_VALIDATION_FAILED"
                        )
            except Exception as e:
                if attempt == 1:
                    raise ValidationException(
                        detail=f"AI coach report generation failed: {str(e)}",
                        error_code="COACH_REPORT_GENERATION_FAILED"
                    )
                    
        weekly_report = WeeklyReport(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            strengths=report_data.strengths,
            weaknesses=report_data.weaknesses,
            recommendations=report_data.recommendations
        )
        
        saved_report = await self.weekly_report_repo.create(weekly_report)
        return saved_report
