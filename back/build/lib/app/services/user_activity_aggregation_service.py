import uuid
from datetime import datetime, date, timedelta, time
from typing import List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.models.user_lesson import UserLesson
from app.models.lesson import Lesson
from app.models.writing_exam import WritingExam
from app.models.user_listening_attempt import UserListeningAttempt
from app.models.user_vocabulary import UserVocabulary
from app.repositories.gamification_repository import GamificationRepository

class ExercisesSummary(BaseModel):
    attempted: int
    passed: int
    failed: int
    pass_rate: float

class WritingExamsSummary(BaseModel):
    count: int
    average_score: float
    score_trend: float

class ListeningExamsSummary(BaseModel):
    count: int
    average_score: float
    score_trend: float

class VocabularySummary(BaseModel):
    words_reviewed: int
    retention_rate: float

class SpeakingSummary(BaseModel):
    sessions: int
    total_minutes: int

class StreakSummary(BaseModel):
    current: int
    change_during_period: int

class ActivitySummary(BaseModel):
    lessons_completed: int
    topics: List[str]
    exercises: ExercisesSummary
    writing_exams: WritingExamsSummary
    listening_exams: ListeningExamsSummary
    vocabulary: VocabularySummary
    speaking: SpeakingSummary
    streak: StreakSummary
    xp_earned: int

class UserActivityAggregationService:
    def __init__(self, session: AsyncSession, gamification_repo: GamificationRepository) -> None:
        self.session = session
        self.gamification_repo = gamification_repo

    async def aggregate_activity(
        self,
        user_id: uuid.UUID,
        period_start: date,
        period_end: date
    ) -> ActivitySummary:
        start_dt = datetime.combine(period_start, time.min)
        end_dt = datetime.combine(period_end, time.max)
        
        duration = period_end - period_start
        prev_start_dt = start_dt - duration - timedelta(days=1)
        prev_end_dt = start_dt - timedelta(seconds=1)

        lessons_res = await self.session.execute(
            select(UserLesson, Lesson.title)
            .join(Lesson)
            .filter(
                UserLesson.user_id == user_id,
                UserLesson.completed_at >= start_dt,
                UserLesson.completed_at <= end_dt
            )
        )
        lessons = lessons_res.all()
        lessons_completed_count = len(lessons)
        topics = [row[1] for row in lessons]

        attempted_ex = 0
        passed_ex = 0
        xp_lessons = 0
        for ul, _ in lessons:
            attempted_ex += ul.exercises_total
            passed_ex += ul.exercises_correct
            xp_lessons += ul.xp_earned
        failed_ex = attempted_ex - passed_ex
        pass_rate = (passed_ex / attempted_ex * 100.0) if attempted_ex > 0 else 0.0

        write_res = await self.session.execute(
            select(WritingExam).filter(
                WritingExam.user_id == user_id,
                WritingExam.created_at >= start_dt,
                WritingExam.created_at <= end_dt
            )
        )
        write_exams = list(write_res.scalars().all())
        write_count = len(write_exams)
        write_scores = [we.overall_score for we in write_exams if we.overall_score is not None]
        write_avg = sum(write_scores) / len(write_scores) if write_scores else 0.0

        prev_write_res = await self.session.execute(
            select(WritingExam).filter(
                WritingExam.user_id == user_id,
                WritingExam.created_at >= prev_start_dt,
                WritingExam.created_at <= prev_end_dt
            )
        )
        prev_write_exams = list(prev_write_res.scalars().all())
        prev_write_scores = [we.overall_score for we in prev_write_exams if we.overall_score is not None]
        prev_write_avg = sum(prev_write_scores) / len(prev_write_scores) if prev_write_scores else 0.0
        write_trend = write_avg - prev_write_avg

        listen_res = await self.session.execute(
            select(UserListeningAttempt).filter(
                UserListeningAttempt.user_id == user_id,
                UserListeningAttempt.completed_at >= start_dt,
                UserListeningAttempt.completed_at <= end_dt
            )
        )
        listen_exams = list(listen_res.scalars().all())
        listen_count = len(listen_exams)
        listen_scores = [la.score for la in listen_exams]
        listen_avg = sum(listen_scores) / len(listen_scores) if listen_scores else 0.0

        prev_listen_res = await self.session.execute(
            select(UserListeningAttempt).filter(
                UserListeningAttempt.user_id == user_id,
                UserListeningAttempt.completed_at >= prev_start_dt,
                UserListeningAttempt.completed_at <= prev_end_dt
            )
        )
        prev_listen_exams = list(prev_listen_res.scalars().all())
        prev_listen_scores = [la.score for la in prev_listen_exams]
        prev_listen_avg = sum(prev_listen_scores) / len(prev_listen_scores) if prev_listen_scores else 0.0
        listen_trend = listen_avg - prev_listen_avg

        vocab_res = await self.session.execute(
            select(UserVocabulary).filter(
                UserVocabulary.user_id == user_id,
                UserVocabulary.last_reviewed_at >= start_dt,
                UserVocabulary.last_reviewed_at <= end_dt
            )
        )
        vocab_items = list(vocab_res.scalars().all())
        words_reviewed = len(vocab_items)
        known_words = sum(1 for v in vocab_items if v.is_known)
        retention_rate = (known_words / words_reviewed * 100.0) if words_reviewed > 0 else 0.0

        gamification = await self.gamification_repo.get_by_user_id(user_id)
        
        xp_exams = 0
        for we in write_exams:
            if we.overall_score is not None and we.overall_score >= 50.0:
                base = 100
                if we.overall_score > 90.0:
                    base = 150
                xp_exams += base
        for la in listen_exams:
            if la.score >= 60.0:
                base = 80
                if la.score > 90.0:
                    base = 120
                xp_exams += base
        xp_vocab = words_reviewed * 15
        total_xp_earned = xp_lessons + xp_exams + xp_vocab

        active_dates = set()
        for ul, _ in lessons:
            if ul.completed_at:
                active_dates.add(ul.completed_at.date())
        for we in write_exams:
            if we.created_at:
                active_dates.add(we.created_at.date())
        for la in listen_exams:
            if la.completed_at:
                active_dates.add(la.completed_at.date())
        for v in vocab_items:
            if v.last_reviewed_at:
                active_dates.add(v.last_reviewed_at.date())
        active_days = len(active_dates)

        return ActivitySummary(
            lessons_completed=lessons_completed_count,
            topics=topics,
            exercises=ExercisesSummary(
                attempted=attempted_ex,
                passed=passed_ex,
                failed=failed_ex,
                pass_rate=pass_rate
            ),
            writing_exams=WritingExamsSummary(
                count=write_count,
                average_score=write_avg,
                score_trend=write_trend
            ),
            listening_exams=ListeningExamsSummary(
                count=listen_count,
                average_score=listen_avg,
                score_trend=listen_trend
            ),
            vocabulary=VocabularySummary(
                words_reviewed=words_reviewed,
                retention_rate=retention_rate
            ),
            speaking=SpeakingSummary(
                sessions=0,
                total_minutes=0
            ),
            streak=StreakSummary(
                current=gamification.current_streak,
                change_during_period=active_days
            ),
            xp_earned=total_xp_earned
        )
