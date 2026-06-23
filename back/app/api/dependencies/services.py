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
from app.repositories.vocabulary_repository import VocabularyRepository
from app.repositories.user_vocabulary_repository import UserVocabularyRepository
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.repositories.user_error_repository import UserErrorRepository
from app.services.vocabulary_service import VocabularyService
from app.services.sm2_service import SM2AlgorithmService
from app.services.review_queue_service import ReviewQueueService
from app.services.spaced_repetition_service import SpacedRepetitionService
from app.services.dashboard_analytics_service import DashboardAnalyticsService
from app.services.error_detection_service import ErrorDetectionService
from app.services.error_explanation_service import ErrorExplanationService
from app.services.error_aggregation_service import ErrorAggregationService
from app.services.error_signal_service import ErrorSignalService
from app.services.vocabulary_extraction_service import VocabularyExtractionService

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

async def get_vocabulary_repository(db: AsyncSession = Depends(get_db_session)) -> VocabularyRepository:
    return VocabularyRepository(db)

async def get_user_vocabulary_repository(db: AsyncSession = Depends(get_db_session)) -> UserVocabularyRepository:
    return UserVocabularyRepository(db)

async def get_spaced_repetition_repository(db: AsyncSession = Depends(get_db_session)) -> SpacedRepetitionRepository:
    return SpacedRepetitionRepository(db)

async def get_user_error_repository(db: AsyncSession = Depends(get_db_session)) -> UserErrorRepository:
    return UserErrorRepository(db)

async def get_vocabulary_service(
    db: AsyncSession = Depends(get_db_session),
    vocab_repo = Depends(get_vocabulary_repository),
    user_vocab_repo = Depends(get_user_vocabulary_repository),
    tts_service = Depends(get_tts_service),
    sr_repo = Depends(get_spaced_repetition_repository)
) -> VocabularyService:
    lang_repo = LanguageRepository(db)
    return VocabularyService(vocab_repo, user_vocab_repo, lang_repo, tts_service, sr_repo)

def get_sm2_algorithm_service() -> SM2AlgorithmService:
    return SM2AlgorithmService()

async def get_review_queue_service(
    vocab_repo = Depends(get_vocabulary_repository),
    sr_repo = Depends(get_spaced_repetition_repository)
) -> ReviewQueueService:
    return ReviewQueueService(sr_repo, vocab_repo)

async def get_spaced_repetition_service(
    sr_repo = Depends(get_spaced_repetition_repository),
    user_vocab_repo = Depends(get_user_vocabulary_repository),
    sm2_service = Depends(get_sm2_algorithm_service)
) -> SpacedRepetitionService:
    return SpacedRepetitionService(sr_repo, user_vocab_repo, sm2_service)

async def get_dashboard_analytics_service(
    sr_repo = Depends(get_spaced_repetition_repository)
) -> DashboardAnalyticsService:
    return DashboardAnalyticsService(sr_repo)

async def get_error_detection_service(
    ai_provider = Depends(get_ai_provider)
) -> ErrorDetectionService:
    return ErrorDetectionService(ai_provider)

async def get_error_explanation_service(
    ai_provider = Depends(get_ai_provider)
) -> ErrorExplanationService:
    return ErrorExplanationService(ai_provider)

async def get_error_aggregation_service(
    user_error_repo = Depends(get_user_error_repository),
    explanation_service = Depends(get_error_explanation_service)
) -> ErrorAggregationService:
    return ErrorAggregationService(user_error_repo, explanation_service)

async def get_error_signal_service(
    user_error_repo = Depends(get_user_error_repository)
) -> ErrorSignalService:
    return ErrorSignalService(user_error_repo)

async def get_vocabulary_extraction_service(
    vocab_service = Depends(get_vocabulary_service),
    user_vocab_repo = Depends(get_user_vocabulary_repository),
    ai_provider = Depends(get_ai_provider)
) -> VocabularyExtractionService:
    return VocabularyExtractionService(vocab_service, user_vocab_repo, ai_provider)

async def get_lesson_scoring_service(
    db: AsyncSession = Depends(get_db_session),
    profile_service = Depends(get_profile_service),
    vocab_extract = Depends(get_vocabulary_extraction_service),
    error_detect = Depends(get_error_detection_service),
    error_aggregate = Depends(get_error_aggregation_service),
    error_signal = Depends(get_error_signal_service)
) -> LessonScoringService:
    repo = await get_user_lesson_repository(db)
    return LessonScoringService(
        repo,
        profile_service,
        vocab_extract,
        error_detect,
        error_aggregate,
        error_signal
    )


