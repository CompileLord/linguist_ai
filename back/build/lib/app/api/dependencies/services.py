from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.services.ai.factory import get_ai_provider
from app.services.ai.prompts import get_prompt_manager
from app.services.media.stt_service import SpeechToTextService
from app.services.speaking_session_service import SpeakingSessionService
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
from app.repositories.tutor_session_repository import TutorSessionRepository
from app.repositories.tutor_message_repository import TutorMessageRepository
from app.repositories.mission_repository import MissionRepository, MissionAttemptRepository
from app.services.websocket_manager import WebSocketConnectionManager
from app.services.tutor_prompt_builder import TutorPromptBuilder
from app.services.session_context_manager import SessionContextManager
from app.services.tutor_rate_limiter import TutorRateLimiter
from app.services.tutor_service import TutorService
from app.services.mission_feedback_service import MissionFeedbackService
from app.services.mission_service import MissionService
from app.repositories.writing_exam_repository import WritingExamRepository
from app.repositories.listening_exam_repository import ListeningExamRepository
from app.services.writing_exam_service import WritingPromptGenerationService, WritingEvaluationService
from app.services.listening_exam_service import ListeningExamScriptGenerationService, ListeningAudioService, ListeningExamService
from app.repositories.gamification_repository import GamificationRepository
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.repositories.user_quota_repository import UserQuotaRepository
from app.services.xp_calculation_service import XPCalculationService
from app.services.streak_tracking_service import StreakTrackingService
from app.services.game_level_progression_service import GameLevelProgressionService
from app.services.achievement_evaluation_engine import AchievementEvaluationEngine
from app.services.achievement_service import AchievementService
from app.services.ai_coach_report_generation_service import AICoachReportGenerationService
from app.services.quota_tracking_service import QuotaTrackingService
from app.services.cache_service import get_cache_service
from app.services.interfaces.cache import AbstractCacheService


async def get_gamification_repository(db: AsyncSession = Depends(get_db_session)) -> GamificationRepository:
    return GamificationRepository(db)

async def get_achievement_repository(db: AsyncSession = Depends(get_db_session)) -> AchievementRepository:
    return AchievementRepository(db)

async def get_weekly_report_repository(db: AsyncSession = Depends(get_db_session)) -> WeeklyReportRepository:
    return WeeklyReportRepository(db)

async def get_user_quota_repository(db: AsyncSession = Depends(get_db_session)) -> UserQuotaRepository:
    return UserQuotaRepository(db)

_xp_calc_service = None

def get_xp_calculation_service() -> XPCalculationService:
    global _xp_calc_service
    if _xp_calc_service is None:
        _xp_calc_service = XPCalculationService()
    return _xp_calc_service

async def get_streak_tracking_service(
    db: AsyncSession = Depends(get_db_session),
    gamification_repo = Depends(get_gamification_repository)
) -> StreakTrackingService:
    profile_repo = ProfileRepository(db)
    return StreakTrackingService(gamification_repo, profile_repo)

async def get_game_level_progression_service(
    gamification_repo = Depends(get_gamification_repository)
) -> GameLevelProgressionService:
    return GameLevelProgressionService(gamification_repo)

async def get_achievement_evaluation_engine(
    db: AsyncSession = Depends(get_db_session),
    gamification_repo = Depends(get_gamification_repository),
    achievement_repo = Depends(get_achievement_repository)
) -> AchievementEvaluationEngine:
    return AchievementEvaluationEngine(db, gamification_repo, achievement_repo)

async def get_achievement_service(
    achievement_repo = Depends(get_achievement_repository),
    evaluation_engine = Depends(get_achievement_evaluation_engine)
) -> AchievementService:
    return AchievementService(achievement_repo, evaluation_engine)

async def get_ai_coach_report_generation_service(
    db: AsyncSession = Depends(get_db_session),
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager),
    gamification_repo = Depends(get_gamification_repository),
    weekly_report_repo = Depends(get_weekly_report_repository)
) -> AICoachReportGenerationService:
    return AICoachReportGenerationService(
        db, ai_provider, prompt_manager, gamification_repo, weekly_report_repo
    )

async def get_quota_tracking_service(
    db: AsyncSession = Depends(get_db_session),
    quota_repo = Depends(get_user_quota_repository),
    cache_service: AbstractCacheService = Depends(get_cache_service)
) -> QuotaTrackingService:
    profile_repo = ProfileRepository(db)
    return QuotaTrackingService(quota_repo, profile_repo, cache_service)


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
    ai_provider = Depends(get_ai_provider),
    cache_service: AbstractCacheService = Depends(get_cache_service)
) -> ErrorExplanationService:
    return ErrorExplanationService(ai_provider, cache_service)

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
    error_signal = Depends(get_error_signal_service),
    xp_calc_service = Depends(get_xp_calculation_service),
    streak_service = Depends(get_streak_tracking_service),
    level_progression_service = Depends(get_game_level_progression_service),
    achievement_service = Depends(get_achievement_service),
    gamification_repo = Depends(get_gamification_repository)
) -> LessonScoringService:
    repo = await get_user_lesson_repository(db)
    return LessonScoringService(
        repo,
        profile_service,
        vocab_extract,
        error_detect,
        error_aggregate,
        error_signal,
        xp_calc_service,
        streak_service,
        level_progression_service,
        achievement_service,
        gamification_repo
    )

_websocket_manager = None

def get_websocket_manager() -> WebSocketConnectionManager:
    global _websocket_manager
    if _websocket_manager is None:
        _websocket_manager = WebSocketConnectionManager()
    return _websocket_manager

async def get_tutor_session_repository(db: AsyncSession = Depends(get_db_session)) -> TutorSessionRepository:
    return TutorSessionRepository(db)

async def get_tutor_message_repository(db: AsyncSession = Depends(get_db_session)) -> TutorMessageRepository:
    return TutorMessageRepository(db)

async def get_tutor_prompt_builder(prompt_manager = Depends(get_prompt_manager)) -> TutorPromptBuilder:
    return TutorPromptBuilder(prompt_manager)

async def get_session_context_manager(
    db: AsyncSession = Depends(get_db_session),
    session_repo = Depends(get_tutor_session_repository),
    message_repo = Depends(get_tutor_message_repository),
    prompt_builder = Depends(get_tutor_prompt_builder)
) -> SessionContextManager:
    profile_repo = ProfileRepository(db)
    goals_repo = GoalsRepository(db)
    return SessionContextManager(session_repo, message_repo, prompt_builder, profile_repo, goals_repo)

async def get_tutor_rate_limiter(db: AsyncSession = Depends(get_db_session)) -> TutorRateLimiter:
    return TutorRateLimiter(db)

async def get_tutor_service(
    session_repo = Depends(get_tutor_session_repository),
    message_repo = Depends(get_tutor_message_repository),
    context_manager = Depends(get_session_context_manager),
    rate_limiter = Depends(get_tutor_rate_limiter),
    ai_provider = Depends(get_ai_provider)
) -> TutorService:
    return TutorService(session_repo, message_repo, context_manager, rate_limiter, ai_provider)

async def get_mission_repository(db: AsyncSession = Depends(get_db_session)) -> MissionRepository:
    return MissionRepository(db)

async def get_mission_attempt_repository(db: AsyncSession = Depends(get_db_session)) -> MissionAttemptRepository:
    return MissionAttemptRepository(db)

async def get_mission_feedback_service(
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager)
) -> MissionFeedbackService:
    return MissionFeedbackService(ai_provider, prompt_manager)

async def get_mission_service(
    db: AsyncSession = Depends(get_db_session),
    mission_repo = Depends(get_mission_repository),
    attempt_repo = Depends(get_mission_attempt_repository),
    session_repo = Depends(get_tutor_session_repository),
    message_repo = Depends(get_tutor_message_repository),
    feedback_service = Depends(get_mission_feedback_service)
) -> MissionService:
    profile_repo = ProfileRepository(db)
    return MissionService(
        mission_repo,
        attempt_repo,
        session_repo,
        message_repo,
        profile_repo,
        feedback_service
    )

async def get_writing_exam_repository(db: AsyncSession = Depends(get_db_session)) -> WritingExamRepository:
    return WritingExamRepository(db)

async def get_listening_exam_repository(db: AsyncSession = Depends(get_db_session)) -> ListeningExamRepository:
    return ListeningExamRepository(db)

async def get_writing_prompt_generation_service(
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager)
) -> WritingPromptGenerationService:
    return WritingPromptGenerationService(ai_provider, prompt_manager)

async def get_writing_evaluation_service(
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager),
    repo = Depends(get_writing_exam_repository),
    xp_calc_service = Depends(get_xp_calculation_service),
    streak_service = Depends(get_streak_tracking_service),
    level_progression_service = Depends(get_game_level_progression_service),
    achievement_service = Depends(get_achievement_service),
    gamification_repo = Depends(get_gamification_repository)
) -> WritingEvaluationService:
    return WritingEvaluationService(
        ai_provider,
        prompt_manager,
        repo,
        xp_calc_service,
        streak_service,
        level_progression_service,
        achievement_service,
        gamification_repo
    )

async def get_listening_exam_script_generation_service(
    ai_provider = Depends(get_ai_provider),
    prompt_manager = Depends(get_prompt_manager)
) -> ListeningExamScriptGenerationService:
    return ListeningExamScriptGenerationService(ai_provider, prompt_manager)

def get_listening_audio_service() -> ListeningAudioService:
    return ListeningAudioService()

async def get_listening_exam_service(
    repo = Depends(get_listening_exam_repository),
    script_service = Depends(get_listening_exam_script_generation_service),
    audio_service = Depends(get_listening_audio_service),
    xp_calc_service = Depends(get_xp_calculation_service),
    streak_service = Depends(get_streak_tracking_service),
    level_progression_service = Depends(get_game_level_progression_service),
    achievement_service = Depends(get_achievement_service),
    gamification_repo = Depends(get_gamification_repository)
) -> ListeningExamService:
    return ListeningExamService(
        repo,
        script_service,
        audio_service,
        xp_calc_service,
        streak_service,
        level_progression_service,
        achievement_service,
        gamification_repo
    )


_stt_service = None

def get_stt_service() -> SpeechToTextService:
    global _stt_service
    if _stt_service is None:
        _stt_service = SpeechToTextService()
    return _stt_service

async def get_speaking_session_service(
    quota_service = Depends(get_quota_tracking_service)
) -> SpeakingSessionService:
    return SpeakingSessionService(quota_service)







