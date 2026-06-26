import time
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import db_manager
from app.core.exceptions import register_exception_handlers
from app.core.middleware import RateLimitMiddleware
from app.core.logging import LoggerFactory
from app.api.dependencies.auth import get_current_active_user
from app.api.routers import auth, onboarding, lessons, vocabulary, review, errors, tutor, missions, writing_exam, listening_exam, gamification, achievement, coach, quota, speaking


logger = LoggerFactory.get_logger("LinguistAI")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in environment: {settings.APP_ENV}")
    connected = await db_manager.check_connection()
    if connected:
        logger.info("Database connection verified successfully.")
    else:
        logger.error("Database connection check failed during startup.")

    logger.info("Verifying local Speech-to-Text and Text-to-Speech models...")
    try:
        import asyncio
        from app.services.media.storage_service import StorageService
        from app.services.media.tts_service import TextToSpeechService
        from app.services.media.stt_service import get_whisper_pipeline
        
        storage_s = StorageService()
        tts_s = TextToSpeechService(storage_s)
        await tts_s._ensure_voice_files("hfc_female")
        await tts_s._ensure_voice_files("hfc_male")
        
        await asyncio.to_thread(get_whisper_pipeline)
        logger.info("Local models verified and loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to verify or download local speech models: {str(e)}")

    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    import os

    app.state.scheduler = AsyncIOScheduler()

    weekly_schedule = os.getenv("WEEKLY_REPORT_SCHEDULE", "0 6 * * 1")
    from app.services.weekly_report_scheduler import run_weekly_reports_job
    app.state.scheduler.add_job(
        run_weekly_reports_job,
        CronTrigger.from_crontab(weekly_schedule, timezone="UTC"),
        id="weekly_reports_job"
    )

    from app.services.quota_tracking_service import QuotaTrackingService
    from app.repositories.user_quota_repository import UserQuotaRepository
    from app.repositories.profile_repository import ProfileRepository

    async def run_quota_cleanup():
        async with db_manager.get_session() as session:
            service = QuotaTrackingService(
                UserQuotaRepository(session),
                ProfileRepository(session)
            )
            await service.run_daily_cleanup_job()

    app.state.scheduler.add_job(
        run_quota_cleanup,
        CronTrigger.from_crontab("5 0 * * *", timezone="UTC"),
        id="quota_cleanup_job"
    )

    app.state.scheduler.start()

    yield

    logger.info(f"Shutting down {settings.APP_NAME}")
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()
        logger.info("Scheduler shutdown.")
    await db_manager.close()
    logger.info("Database connections closed.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.APP_DEBUG,
    lifespan=lifespan
)

if settings.CORS_ALLOW_ALL:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Rate-Limit-Remaining"]
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=len(settings.CORS_ORIGINS) > 0,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Rate-Limit-Remaining"]
    )

app.add_middleware(RateLimitMiddleware)

register_exception_handlers(app)

app.mount("/static", StaticFiles(directory="media"), name="static")

app.include_router(tutor.ws_router)
app.include_router(speaking.ws_router)

# Register all API routers exactly once under the /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(vocabulary.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(errors.router, prefix="/api")
app.include_router(tutor.router, prefix="/api")
app.include_router(missions.router, prefix="/api")
app.include_router(writing_exam.router, prefix="/api")
app.include_router(listening_exam.router, prefix="/api")
app.include_router(gamification.router, prefix="/api")
app.include_router(achievement.router, prefix="/api")
app.include_router(coach.router, prefix="/api")
app.include_router(coach.admin_router, prefix="/api")
app.include_router(quota.router, prefix="/api")
app.include_router(speaking.router, prefix="/api")

# Middleware to dynamically rewrite legacy non-prefixed paths (used by tests) to the new /api prefix
@app.middleware("http")
async def rewrite_legacy_paths(request, call_next):
    path = request.scope.get("path", "")
    legacy_prefixes = (
        "/auth", "/onboarding", "/profile", "/lessons", "/vocabulary", "/review",
        "/errors", "/tutor", "/missions", "/exams", "/gamification", 
        "/achievements", "/coach", "/admin", "/quota", "/speaking"
    )
    if path.startswith(legacy_prefixes):
        request.scope["path"] = f"/api{path}"
    return await call_next(request)




@app.get("/")
async def root():
    return {"service": settings.APP_NAME, "status": "ok", "version": settings.APP_VERSION}

@app.get("/health")
async def health_check():
    start_time = time.time()
    db_up = await db_manager.check_connection()
    latency_ms = (time.time() - start_time) * 1000.0
    
    status_str = "healthy" if db_up else "unhealthy"
    status_code = status.HTTP_200_OK if db_up else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status_str,
            "checks": {
                "database": {
                    "status": "up" if db_up else "down",
                    "latency_ms": round(latency_ms, 2)
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )
