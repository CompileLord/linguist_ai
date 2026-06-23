import uuid
from datetime import datetime
from typing import Optional
from app.models.lesson import Lesson
from app.models.enums import CEFRLevel
from app.schemas.lesson import LessonCompletionRequest, LessonCompletionResponse
from app.services.interfaces.profile import AbstractProfileService
from app.repositories.interfaces.lesson import AbstractUserLessonRepository

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
        profile_service: AbstractProfileService
    ) -> None:
        self._user_lesson_repository = user_lesson_repository
        self._profile_service = profile_service

    async def calculate_score(
        self,
        user_id: uuid.UUID,
        lesson: Lesson,
        answers: LessonCompletionRequest
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

        # Fetch profile for streak and XP calculation
        profile = await self._profile_service.get_profile(user_id)
        streak_count = profile.streak_count

        base_xp = 50
        score_bonus = int(score * 100)
        streak_bonus = min(50, streak_count * 5)
        xp_earned = base_xp + score_bonus + streak_bonus

        # Check level up
        level_up = False
        current_level = profile.current_level or CEFRLevel.A1
        if current_level != CEFRLevel.C2:
            next_idx = list(CEFRLevel).index(current_level) + 1
            next_level = list(CEFRLevel)[next_idx]
            next_threshold = THRESHOLD_MAP[next_level]
            if profile.total_xp + xp_earned >= next_threshold:
                level_up = True
                await self._profile_service.complete_placement(user_id, next_level, profile.placement_score or 0.0)

        # Update streak: increment by 1
        await self._profile_service.add_xp(user_id, xp_earned)
        await self._profile_service.complete_placement(user_id, profile.current_level or CEFRLevel.A1, profile.placement_score or 0.0)
        
        # Check if user lesson record exists, create or update it
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

        return LessonCompletionResponse(
            score=score,
            xp_earned=xp_earned,
            exercises_correct=earned_points,
            exercises_total=total_points,
            accuracy=accuracy,
            level_up=level_up
        )
