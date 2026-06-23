from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.services.ai.factory import get_ai_provider
from app.services.ai.prompts import get_prompt_manager
from app.repositories.language_repository import LanguageRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.goals_repository import GoalsRepository
from app.repositories.lesson_repository import LessonRepository, UserLessonRepository
from app.services.language_service import LanguageService
from app.services.profile_service import ProfileService
from app.services.placement_service import PlacementTestService
from app.services.lesson_generator_service import LessonGeneratorService
from app.services.lesson_scoring_service import LessonScoringService
from app.services.media.storage_service import get_storage_service
from app.services.media.tts_service import TextToSpeechService

_tts_service = None

def get_tts_service(storage_service = Depends(get_storage_service)) -> TextToSpeechService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TextToSpeechService(storage_service)
    return _tts_service

async def get_language_service(db: AsyncSession = Depends(get_db_session)) -> LanguageService:
    repo = LanguageRepository(db)
    return LanguageService(repo)

async def get_profile_service(db: AsyncSession = Depends(get_db_session)) -> ProfileService:
    repo = ProfileRepository(db)
    goals_repo = GoalsRepository(db)
    lang_service = await get_language_service(db)
    return ProfileService(repo, goals_repo, lang_service)

async def get_placement_test_service(
    db: AsyncSession = Depends(get_db_session),
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager)
) -> PlacementTestService:
    profile_service = await get_profile_service(db)
    return PlacementTestService(ai_provider, prompt_manager, profile_service)

async def get_lesson_repository(db: AsyncSession = Depends(get_db_session)) -> LessonRepository:
    return LessonRepository(db)

async def get_user_lesson_repository(db: AsyncSession = Depends(get_db_session)) -> UserLessonRepository:
    return UserLessonRepository(db)

async def get_lesson_generator_service(
    db: AsyncSession = Depends(get_db_session),
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager),
    tts_service = Depends(get_tts_service)
) -> LessonGeneratorService:
    repo = await get_lesson_repository(db)
    return LessonGeneratorService(repo, ai_provider, prompt_manager, tts_service)

async def get_lesson_scoring_service(
    db: AsyncSession = Depends(get_db_session),
    profile_service = Depends(get_profile_service)
) -> LessonScoringService:
    repo = await get_user_lesson_repository(db)
    return LessonScoringService(repo, profile_service)
