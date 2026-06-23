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
from app.api.routers import auth, onboarding, lessons, vocabulary, review, errors

logger = LoggerFactory.get_logger("LinguistAI")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in environment: {settings.APP_ENV}")
    connected = await db_manager.check_connection()
    if connected:
        logger.info("Database connection verified successfully.")
    else:
        logger.error("Database connection check failed during startup.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")
    await db_manager.close()
    logger.info("Database connections closed.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.APP_DEBUG,
    lifespan=lifespan
)

if settings.APP_ENV == "development":
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

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(lessons.router)
app.include_router(vocabulary.router)
app.include_router(review.router)
app.include_router(errors.router)

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
