import uuid
from typing import List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import ConditionType
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.models.user_lesson import UserLesson
from app.models.user_vocabulary import UserVocabulary
from app.models.writing_exam import WritingExam
from app.models.user_listening_attempt import UserListeningAttempt
from app.repositories.interfaces.gamification import AbstractGamificationRepository
from app.repositories.interfaces.achievement import AbstractAchievementRepository

class AchievementEvaluationEngine:
    def __init__(
        self,
        session: AsyncSession,
        gamification_repo: AbstractGamificationRepository,
        achievement_repo: AbstractAchievementRepository
    ) -> None:
        self.session = session
        self.gamification_repo = gamification_repo
        self.achievement_repo = achievement_repo

    async def evaluate_achievements(
        self,
        user_id: uuid.UUID,
        event_type: str,
        context: dict = None
    ) -> List[Achievement]:
        context = context or {}
        
        condition_types = []
        if event_type == "lesson_completion":
            condition_types = [ConditionType.LESSONS_COMPLETED, ConditionType.SPECIFIC_ACTION]
        elif event_type == "streak_update":
            condition_types = [ConditionType.STREAK_DAYS, ConditionType.SPECIFIC_ACTION]
        elif event_type == "vocabulary_milestone":
            condition_types = [ConditionType.WORDS_LEARNED, ConditionType.SPECIFIC_ACTION]
        elif event_type == "exam_completion":
            condition_types = [ConditionType.EXAMS_PASSED, ConditionType.SPECIFIC_ACTION]
        elif event_type == "speaking_session":
            condition_types = [ConditionType.SPEAKING_MINUTES, ConditionType.SPECIFIC_ACTION]
            
        if not condition_types:
            return []

        achievements_result = await self.session.execute(
            select(Achievement).filter(Achievement.condition_type.in_(condition_types))
        )
        achievements = list(achievements_result.scalars().all())

        user_ach_result = await self.session.execute(
            select(UserAchievement.achievement_id).filter(UserAchievement.user_id == user_id)
        )
        earned_ids = {row[0] for row in user_ach_result.all()}
        unearned = [ach for ach in achievements if ach.id not in earned_ids]

        if not unearned:
            return []

        stats = {}
        
        if ConditionType.LESSONS_COMPLETED in condition_types:
            res = await self.session.execute(
                select(func.count(UserLesson.id)).filter(
                    UserLesson.user_id == user_id,
                    UserLesson.completed_at.isnot(None)
                )
            )
            stats[ConditionType.LESSONS_COMPLETED] = res.scalar() or 0

        if ConditionType.STREAK_DAYS in condition_types:
            gamification = await self.gamification_repo.get_by_user_id(user_id)
            stats[ConditionType.STREAK_DAYS] = gamification.longest_streak

        if ConditionType.WORDS_LEARNED in condition_types:
            res = await self.session.execute(
                select(func.count(UserVocabulary.id)).filter(
                    UserVocabulary.user_id == user_id,
                    UserVocabulary.is_known == True
                )
            )
            stats[ConditionType.WORDS_LEARNED] = res.scalar() or 0

        if ConditionType.EXAMS_PASSED in condition_types:
            res_w = await self.session.execute(
                select(func.count(WritingExam.id)).filter(
                    WritingExam.user_id == user_id,
                    WritingExam.overall_score >= 50.0
                )
            )
            res_l = await self.session.execute(
                select(func.count(UserListeningAttempt.id)).filter(
                    UserListeningAttempt.user_id == user_id,
                    UserListeningAttempt.score >= 60.0
                )
            )
            stats[ConditionType.EXAMS_PASSED] = (res_w.scalar() or 0) + (res_l.scalar() or 0)

        if ConditionType.SPEAKING_MINUTES in condition_types:
            gamification = await self.gamification_repo.get_by_user_id(user_id)
            stats[ConditionType.SPEAKING_MINUTES] = gamification.total_speaking_minutes

        new_achievements = []
        for ach in unearned:
            if ach.condition_type == ConditionType.SPECIFIC_ACTION:
                code = ach.code
                if code == "first_lesson" and event_type == "lesson_completion":
                    lesson_count = stats.get(ConditionType.LESSONS_COMPLETED)
                    if lesson_count is None:
                        res = await self.session.execute(
                            select(func.count(UserLesson.id)).filter(
                                UserLesson.user_id == user_id,
                                UserLesson.completed_at.isnot(None)
                            )
                        )
                        lesson_count = res.scalar() or 0
                    if lesson_count >= 1:
                        new_achievements.append(ach)
                elif code == "first_writing_exam" and event_type == "exam_completion":
                    if context.get("exam_type") == "writing":
                        new_achievements.append(ach)
                elif code == "first_listening_exam" and event_type == "exam_completion":
                    if context.get("exam_type") == "listening":
                        new_achievements.append(ach)
                elif code == "perfect_exam_score" and event_type == "exam_completion":
                    score = context.get("score", 0)
                    if score >= 100.0:
                        new_achievements.append(ach)
            else:
                user_val = stats.get(ach.condition_type, 0)
                if user_val >= ach.condition_value:
                    new_achievements.append(ach)
                    
        return new_achievements
