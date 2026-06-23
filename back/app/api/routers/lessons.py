import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, BackgroundTasks
from app.models.user import User
from app.models.enums import CEFRLevel
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_profile_service,
    get_language_service,
    get_lesson_generator_service,
    get_lesson_scoring_service,
    get_lesson_repository,
    get_user_lesson_repository
)
from app.services.profile_service import ProfileService
from app.services.language_service import LanguageService
from app.services.lesson_generator_service import LessonGeneratorService
from app.services.lesson_scoring_service import LessonScoringService
from app.repositories.lesson_repository import LessonRepository, UserLessonRepository
from app.schemas.lesson import LessonResponse, LessonCompletionRequest, LessonCompletionResponse, LessonSummaryResponse
from app.core.exceptions import NotFoundException
from app.models.user_lesson import UserLesson
from datetime import datetime

router = APIRouter(prefix="/lessons", tags=["Lessons"])

CURRICULUM = {
    CEFRLevel.A1: ["Greetings", "Family", "Numbers & Colors", "Present Simple"],
    CEFRLevel.A2: ["Past Simple", "Daily Routines", "Shopping", "Comparatives"],
    CEFRLevel.B1: ["Present Perfect", "Travel Planning", "Modal Verbs", "Work Life"],
    CEFRLevel.B2: ["Passive Voice", "Conditionals", "Reported Speech", "Environment"],
    CEFRLevel.C1: ["Advanced Idioms", "Subjunctive Mood", "Financial English", "Abstract Ideas"],
    CEFRLevel.C2: ["Rhetoric", "Nuanced Debates", "Literary Analysis", "Complex Syntax"]
}

@router.get("/next", response_model=LessonResponse, status_code=status.HTTP_200_OK)
async def get_next_lesson(
    current_user: User = Depends(get_current_active_user),
    profile_service: ProfileService = Depends(get_profile_service),
    language_service: LanguageService = Depends(get_language_service),
    lesson_generator_service: LessonGeneratorService = Depends(get_lesson_generator_service),
    user_lesson_repository: UserLessonRepository = Depends(get_user_lesson_repository)
):
    profile = await profile_service.get_profile(current_user.id)
    level = profile.current_level or CEFRLevel.A1
    lang = await language_service.validate_language_code(profile.target_language_code)

    history = await user_lesson_repository.get_user_history(current_user.id, status="completed")
    
    next_topic = None
    if history:
        last_ul = history[0]
        last_lesson = last_ul.lesson
        if last_lesson.cefr_level == level and last_ul.score is not None and last_ul.score < 0.7:
            next_topic = f"Review of {last_lesson.topic}"

    if not next_topic:
        completed_topics = {ul.lesson.topic for ul in history if ul.lesson.cefr_level == level}
        topics_curriculum = CURRICULUM.get(level, CURRICULUM[CEFRLevel.B1])
        
        for t in topics_curriculum:
            if t.lower().strip() not in {ct.lower().strip() for ct in completed_topics}:
                next_topic = t
                break
                
        if not next_topic:
            next_topic = topics_curriculum[-1]

    lesson = await lesson_generator_service.generate_lesson(
        language=lang,
        level=level,
        topic=next_topic,
        user_goals=[g.goal_type for g in profile.goals],
        native_language_code=profile.native_language_code
    )

    user_lesson = await user_lesson_repository.get_user_lesson(current_user.id, lesson.id)
    if not user_lesson:
        user_lesson = UserLesson(
            user_id=current_user.id,
            lesson_id=lesson.id,
            status="in_progress",
            started_at=datetime.utcnow()
        )
        await user_lesson_repository.create(user_lesson)

    return lesson

@router.get("/history", response_model=List[LessonSummaryResponse], status_code=status.HTTP_200_OK)
async def get_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    user_lesson_repository: UserLessonRepository = Depends(get_user_lesson_repository)
):
    history = await user_lesson_repository.get_user_history(current_user.id, limit=limit, offset=offset)
    return [
        LessonSummaryResponse(
            id=ul.id,
            lesson_id=ul.lesson_id,
            title=ul.lesson.title,
            topic=ul.lesson.topic,
            status=ul.status,
            score=ul.score,
            xp_earned=ul.xp_earned,
            completed_at=ul.completed_at
        ) for ul in history
    ]

@router.get("/{lesson_id}", response_model=LessonResponse, status_code=status.HTTP_200_OK)
async def get_lesson_by_id(
    lesson_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    lesson_repository: LessonRepository = Depends(get_lesson_repository),
    user_lesson_repository: UserLessonRepository = Depends(get_user_lesson_repository)
):
    lesson = await lesson_repository.get_by_id(lesson_id)
    if not lesson:
        raise NotFoundException("Lesson not found")

    user_lesson = await user_lesson_repository.get_user_lesson(current_user.id, lesson_id)
    if not user_lesson:
        user_lesson = UserLesson(
            user_id=current_user.id,
            lesson_id=lesson_id,
            status="in_progress",
            started_at=datetime.utcnow()
        )
        await user_lesson_repository.create(user_lesson)
    elif user_lesson.status == "not_started":
        user_lesson.status = "in_progress"
        user_lesson.started_at = datetime.utcnow()
        await user_lesson_repository.update(user_lesson)

    return lesson

@router.post("/{lesson_id}/complete", response_model=LessonCompletionResponse, status_code=status.HTTP_200_OK)
async def complete_lesson(
    lesson_id: uuid.UUID,
    schema: LessonCompletionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    lesson_repository: LessonRepository = Depends(get_lesson_repository),
    lesson_scoring_service: LessonScoringService = Depends(get_lesson_scoring_service)
):
    lesson = await lesson_repository.get_by_id(lesson_id)
    if not lesson:
        raise NotFoundException("Lesson not found")

    return await lesson_scoring_service.calculate_score(current_user.id, lesson, schema, background_tasks)
