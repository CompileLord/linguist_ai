import uuid
import asyncio
from datetime import datetime
from typing import Optional, List
from fastapi import BackgroundTasks
from app.models.lesson import Lesson
from app.models.enums import CEFRLevel
from app.schemas.lesson import LessonCompletionRequest, LessonCompletionResponse
from app.services.interfaces.profile import AbstractProfileService
from app.repositories.interfaces.lesson import AbstractUserLessonRepository
from app.services.vocabulary_extraction_service import VocabularyExtractionService
from app.services.error_detection_service import ErrorDetectionService
from app.services.error_aggregation_service import ErrorAggregationService
from app.services.error_signal_service import ErrorSignalService
from app.models.user_profile import UserProfile
from app.services.xp_calculation_service import ActionType, XPCalculationService
from app.services.streak_tracking_service import StreakTrackingService
from app.services.game_level_progression_service import GameLevelProgressionService
from app.services.achievement_service import AchievementService
from app.repositories.gamification_repository import GamificationRepository

THRESHOLD_MAP = {
    CEFRLevel.A1: 0,
    CEFRLevel.A2: 1000,
    CEFRLevel.B1: 3000,
    CEFRLevel.B2: 6000,
    CEFRLevel.C1: 10000,
    CEFRLevel.C2: 15000
}

class LessonScoringService:
    def __init__(
        self,
        user_lesson_repository: AbstractUserLessonRepository,
        profile_service: AbstractProfileService,
        vocab_extraction_service: Optional[VocabularyExtractionService] = None,
        error_detection_service: Optional[ErrorDetectionService] = None,
        error_aggregation_service: Optional[ErrorAggregationService] = None,
        error_signal_service: Optional[ErrorSignalService] = None,
        xp_calc_service: Optional[XPCalculationService] = None,
        streak_service: Optional[StreakTrackingService] = None,
        level_progression_service: Optional[GameLevelProgressionService] = None,
        achievement_service: Optional[AchievementService] = None,
        gamification_repo: Optional[GamificationRepository] = None
    ) -> None:
        self._user_lesson_repository = user_lesson_repository
        self._profile_service = profile_service
        self._vocab_extraction_service = vocab_extraction_service
        self._error_detection_service = error_detection_service
        self._error_aggregation_service = error_aggregation_service
        self._error_signal_service = error_signal_service
        self._xp_calc_service = xp_calc_service
        self._streak_service = streak_service
        self._level_progression_service = level_progression_service
        self._achievement_service = achievement_service
        self._gamification_repo = gamification_repo


    async def calculate_score(
        self,
        user_id: uuid.UUID,
        lesson: Lesson,
        answers: LessonCompletionRequest,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> LessonCompletionResponse:
        content = lesson.content
        exercises = content.get("exercises", [])
        test = content.get("test", [])

        earned_points = 0
        total_points = 0

        # Score exercises
        for i, ex in enumerate(exercises):
            total_points += 1
            if i < len(answers.exercise_answers):
                user_ans = answers.exercise_answers[i].strip().lower()
                correct_ans = ex.get("correct_answer", "").strip().lower()
                if user_ans == correct_ans:
                    earned_points += 1

        # Score test
        for i, tq in enumerate(test):
            points = tq.get("points", 1)
            total_points += points
            if i < len(answers.test_answers):
                user_ans_idx = answers.test_answers[i]
                correct_idx = tq.get("correct_index", -1)
                if user_ans_idx == correct_idx:
                    earned_points += points

        score = (earned_points / total_points) if total_points > 0 else 0.0
        accuracy = score

        profile = await self._profile_service.get_profile(user_id)
        streak_count = profile.streak_count

        if self._xp_calc_service:
            xp_earned = self._xp_calc_service.calculate_xp(ActionType.LESSON_COMPLETION)
        else:
            base_xp = 50
            score_bonus = int(score * 100)
            streak_bonus = min(50, streak_count * 5)
            xp_earned = base_xp + score_bonus + streak_bonus

        level_up = False
        current_level = profile.current_level or CEFRLevel.A1
        if current_level != CEFRLevel.C2:
            next_idx = list(CEFRLevel).index(current_level) + 1
            next_level = list(CEFRLevel)[next_idx]
            next_threshold = THRESHOLD_MAP[next_level]
            if profile.total_xp + xp_earned >= next_threshold:
                level_up = True
                await self._profile_service.complete_placement(user_id, next_level, profile.placement_score or 0.0)

        await self._profile_service.add_xp(user_id, xp_earned)
        await self._profile_service.complete_placement(user_id, profile.current_level or CEFRLevel.A1, profile.placement_score or 0.0)
        
        user_lesson = await self._user_lesson_repository.get_user_lesson(user_id, lesson.id)
        updates = {
            "status": "completed",
            "score": score,
            "completed_at": datetime.utcnow(),
            "time_spent_seconds": answers.time_spent_seconds,
            "exercises_correct": earned_points,
            "exercises_total": total_points,
            "xp_earned": xp_earned
        }

        if user_lesson:
            await self._user_lesson_repository.update_progress(user_lesson.id, updates)
        else:
            from app.models.user_lesson import UserLesson
            new_ul = UserLesson(
                user_id=user_id,
                lesson_id=lesson.id,
                status="completed",
                score=score,
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                time_spent_seconds=answers.time_spent_seconds,
                exercises_correct=earned_points,
                exercises_total=total_points,
                xp_earned=xp_earned
            )
            await self._user_lesson_repository.create(new_ul)

        if self._gamification_repo:
            await self._gamification_repo.add_xp(user_id, xp_earned)
        if self._streak_service:
            await self._streak_service.record_activity(user_id)
        if self._level_progression_service:
            await self._level_progression_service.check_and_apply_level_up(user_id)
        if self._achievement_service:
            await self._achievement_service.evaluate_and_award(user_id, "lesson_completion")

        if hasattr(self._user_lesson_repository, "save_changes"):
            await self._user_lesson_repository.save_changes()

        print("SCORING SERVICE STATUS - VOCAB EXTRACT:", self._vocab_extraction_service is not None, "ERROR DETECT:", self._error_detection_service is not None)
        if self._vocab_extraction_service or self._error_detection_service:
            theory = content.get("theory", {})
            theory_explanation = theory.get("explanation", "")
            examples_text = " ".join([ex.get("source_text", "") for ex in content.get("examples", [])])
            vocab_text = " ".join([v.get("word", "") for v in content.get("vocabulary", [])])
            lesson_text = f"{theory_explanation} {examples_text} {vocab_text}"
            print("QUEUEING BACKGROUND TASK, HAS BACKGROUND_TASKS OBJ:", background_tasks is not None)
            if background_tasks:
                background_tasks.add_task(
                    self._process_lesson_completion_background,
                    user_id, lesson, lesson_text, answers, profile
                )
            else:
                asyncio.create_task(self._process_lesson_completion_background(
                    user_id, lesson, lesson_text, answers, profile
                ))

        return LessonCompletionResponse(
            score=score,
            xp_earned=xp_earned,
            exercises_correct=earned_points,
            exercises_total=total_points,
            accuracy=accuracy,
            level_up=level_up
        )

    async def _process_lesson_completion_background(
        self,
        user_id: uuid.UUID,
        lesson: Lesson,
        lesson_text: str,
        answers: LessonCompletionRequest,
        profile: any
    ) -> None:
        try:
            from sqlalchemy import select
            from app.models.language import Language
            from app.models.user_profile import UserProfile
            from app.core.database import db_manager
            
            from app.repositories.vocabulary_repository import VocabularyRepository
            from app.repositories.user_vocabulary_repository import UserVocabularyRepository
            from app.repositories.language_repository import LanguageRepository
            from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
            from app.repositories.user_error_repository import UserErrorRepository
            
            from app.services.vocabulary_service import VocabularyService
            from app.services.vocabulary_extraction_service import VocabularyExtractionService
            from app.services.error_explanation_service import ErrorExplanationService
            from app.services.error_aggregation_service import ErrorAggregationService
            from app.services.error_signal_service import ErrorSignalService

            async with db_manager.get_session() as session:
                res = await session.execute(select(UserProfile).filter(UserProfile.user_id == user_id))
                db_profile = res.scalar_one_or_none()

                if not db_profile:
                    return

                vocab_repo = VocabularyRepository(session)
                user_vocab_repo = UserVocabularyRepository(session)
                lang_repo = LanguageRepository(session)
                sr_repo = SpacedRepetitionRepository(session)
                user_error_repo = UserErrorRepository(session)

                if self._vocab_extraction_service:
                    res_lang = await session.execute(select(Language).filter(Language.id == db_profile.target_language_id))
                    lang = res_lang.scalar_one_or_none()
                    target_lang_name = lang.name if lang else "English"
                    
                    tts_service = self._vocab_extraction_service._vocabulary_service._tts_service
                    ai_provider = self._vocab_extraction_service._ai_provider
                    
                    vocab_service = VocabularyService(vocab_repo, user_vocab_repo, lang_repo, tts_service, sr_repo)
                    new_vocab_extraction = VocabularyExtractionService(vocab_service, user_vocab_repo, ai_provider)
                    
                    await new_vocab_extraction.extract_and_add_vocabulary(
                        user_id=user_id,
                        lesson_text=lesson_text,
                        profile=db_profile,
                        target_language_name=target_lang_name
                    )

                if self._error_detection_service and self._error_aggregation_service:
                    content = lesson.content
                    exercises = content.get("exercises", [])
                    incorrect_text = []
                    for i, ex in enumerate(exercises):
                        if i < len(answers.exercise_answers):
                            user_ans = answers.exercise_answers[i].strip()
                            correct_ans = ex.get("correct_answer", "").strip()
                            if user_ans.lower() != correct_ans.lower():
                                incorrect_text.append(f"Question: {ex.get('question')} | User Answer: {user_ans} | Correct Answer: {correct_ans}")
                    
                    if incorrect_text:
                        full_incorrect_str = "\n".join(incorrect_text)
                        
                        res_lang = await session.execute(select(Language).filter(Language.id == db_profile.target_language_id))
                        lang = res_lang.scalar_one_or_none()
                        target_lang_name = lang.name if lang else "English"
                        
                        detected = await self._error_detection_service.detect_errors(
                            user_text=full_incorrect_str,
                            context_type=f"Lesson: {lesson.title}",
                            target_language=target_lang_name,
                            cefr_level=db_profile.current_level or CEFRLevel.A1
                        )
                        
                        if detected:
                            error_ai_provider = self._error_detection_service._ai_provider
                            explanation_service = ErrorExplanationService(error_ai_provider)
                            new_error_aggregation = ErrorAggregationService(user_error_repo, explanation_service)
                            
                            await new_error_aggregation.record_errors(
                                user_id=user_id,
                                detected_errors=detected,
                                related_lesson_id=lesson.id,
                                profile=db_profile,
                                target_language_name=target_lang_name
                            )
                            
                            if self._error_signal_service:
                                new_error_signal = ErrorSignalService(user_error_repo)
                                await new_error_signal.check_and_emit_signals(user_id)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e
