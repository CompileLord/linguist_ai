# Comprehensive Backend Architectural & Code Quality Audit

## 1. System Architecture & Data Flow Overview

**Architecture & Pattern Assessment:**
The backend utilizes FastAPI and is structured around a multi-layered architecture loosely resembling Clean Architecture and Domain-Driven Design (DDD). The codebase is divided into:
- `api/routers`: Handles HTTP/WebSocket requests, authentication, and payload validation.
- `services`: Contains business logic and orchestrates models/repositories.
- `repositories`: Handles direct database interactions (SQLAlchemy).
- `models`: SQLAlchemy ORM definitions.
- `schemas`: Pydantic models for validation.
- `core`: Global configurations, database manager, and middlewares.

**Separation of Concerns:**
While the directory structure suggests a clean separation, the implementation leaks concerns across boundaries. For instance, some API routers (e.g., `ws_speaking` in `speaking.py`, `ws_tutor` in `tutor.py`) embed substantial business logic, orchestrate multiple repositories, and even handle direct TTS/STT orchestration and WebSocket chunking. Furthermore, several services instantiate database sessions directly (`async with db_manager.get_session()`) instead of receiving injected dependencies, breaking the repository pattern's abstraction and making unit testing difficult.

**Data Lifecycle:**
Incoming requests hit FastAPI routers, where Pydantic schemas validate payloads. Routers use FastAPI `Depends` to inject services/repositories. Services process the request (often communicating with external AI models via `AbstractAIProvider`) and call repositories to persist data via SQLAlchemy's `AsyncSession`. While the general flow is solid, the manual management of sessions within some services bypasses the intended request-scoped transaction lifecycle.

---

## 2. High-Risk Logical Issues & Edge Cases

*   **Stateful Services in a Distributed Environment:**
    *   `ErrorSignalService` maintains an in-memory class variable `_emitted_signals: List[Dict[str, Any]]`.
    *   `ErrorExplanationService` uses an in-memory `_cache: Dict[str, str]`.
    *   `QuotaTrackingService` maintains an in-memory `_cache` for configuration limits.
    *   *Risk:* In a multi-worker production environment (e.g., multiple Uvicorn workers or distributed containers), these in-memory states will be isolated per worker. This leads to inconsistent caching, memory leaks, and logic failures (like duplicated signals).
*   **Race Conditions in Concurrent Operations:**
    *   `QuotaTrackingService.check_quota` performs a "check-then-act" sequence: it queries for an existing `UserQuota`, and if not found, creates one. Concurrent requests could lead to `IntegrityError` or multiple quota records for the same function and date.
    *   Similar race conditions exist in `user_lesson_repository.get_user_lesson()` logic.
*   **WebSocket Error Handling and Unbounded Loops:**
    *   In `tutor.py` and `speaking.py`, WebSockets use `while True:` loops to parse audio and handle text generation. The error handling is overly broad (`except Exception:`), which masks underlying issues and can lead to silent failures or memory leaks if connections hang.

---

## 3. Performance Bottlenecks & Scalability Blindspots

*   **Database Session Management:**
    *   Services like `weekly_report_scheduler.py` iterate over users and create new database sessions inside loops (`async with db_manager.get_session() as session:`). This can exhaust connection pools under heavy load.
*   **N+1 Queries and Inefficient Joins:**
    *   In several routers (e.g., `list_missions`), the code loops over retrieved models to fetch related data (e.g., `attempts = await attempt_repo.list_by_user(..., mission_id=m.id)`). This results in an N+1 query problem. This should be solved using SQLAlchemy's `joinedload` or subqueries.
*   **Computational Bottlenecks in the Main Thread:**
    *   The `TextToSpeechService` uses `io.BytesIO` and synchronous file operations (like `wave.open(wav_io, "wb")`) within `async` functions without deferring to a thread pool via `asyncio.to_thread`. This blocks the main event loop, significantly degrading FastAPI's concurrency.
*   **Missing Pagination:**
    *   Certain endpoints default to fetching all records or have excessively high default limits without hard boundaries, risking memory exhaustion if tables grow large.

---

## 4. Code Maintenance & Modernization Opportunities

*   **Decoupling WebSockets & Business Logic:**
    *   Routers like `ws_speaking` are over 100 lines of complex procedural code. The extraction, audio processing, and AI generation logic should be moved to a dedicated `SpeakingInteractionService`.
*   **DRY Principle Violations:**
    *   Counting total items for pagination is manually rewritten across `vocabulary.py`, `writing_exam.py`, and `coach.py`. This should be abstracted into a generic repository pagination method.
*   **Hardcoded Configuration:**
    *   TTS/STT URLs and local paths (e.g., `VOICE_MAP` in `tts_service.py`) are hardcoded. These should be moved to the `Settings` class or environment variables.
*   **Modern Language Patterns:**
    *   Use of Dependency Injection (DI) should be standardized. Currently, there is a mix of `Depends()` at the router level and manual instantiations (e.g., `ProfileRepository(db)`) inside router bodies. A centralized DI container or consistent FastAPI dependency injection pattern is highly recommended.

---

## 5. Actionable Roadmap & Priority Matrix

| Component/File | Issue Summary | Impact Severity | Effort to Fix |
| :--- | :--- | :--- | :--- |
| `app/services/error_signal_service.py`, `error_explanation_service.py` | In-memory class variables (`_emitted_signals`, `_cache`) used for state, causing memory leaks and breaking multi-worker setups. | **Critical** | Low |
| `app/api/routers/speaking.py`, `tutor.py` | Blocking synchronous audio/wave operations (`wave.open`) inside `async` WebSocket endpoints, starving the event loop. | **Critical** | Medium |
| `app/api/routers/missions.py` | N+1 query issue in `list_missions` loop fetching attempts per mission. | **High** | Low |
| `app/services/quota_tracking_service.py` | Race condition in quota creation/checking logic (check-then-act pattern). | **High** | Low |
| `app/api/routers/speaking.py` | God-function: `ws_speaking` contains massive business logic, STT/TTS orchestration, and chunking. Violates SRP. | **Medium** | High |
| `app/services/weekly_report_scheduler.py` | Inefficient session management: opening new DB sessions inside a loop. | **Medium** | Low |


### Production-Ready Refactoring Blueprints for Top Issues

#### Blueprint 1: Fixing In-Memory Caching (Critical)
*Issue: `ErrorExplanationService` and `ErrorSignalService` use in-memory dicts/lists.*
**Solution:** Migrate caching to Redis or use an async lru_cache with a TTL, and persist signals to the database.

```python
# Refactored ErrorExplanationService leveraging an async Redis client (or an injected Cache provider)
import hashlib
from typing import Optional
from app.models.enums import CEFRLevel
from app.services.ai.base import AbstractAIProvider
from app.services.cache_service import AbstractCacheService # New abstraction

class ErrorExplanationService:
    def __init__(self, ai_provider: AbstractAIProvider, cache_service: AbstractCacheService) -> None:
        self._ai_provider = ai_provider
        self._cache_service = cache_service

    def _generate_cache_key(self, error_text: str, correct_text: str, category: str, target_language: str, ui_language: str) -> str:
        raw_key = f"{error_text}||{correct_text}||{category}||{target_language}||{ui_language}"
        return f"error_explanation:{hashlib.sha256(raw_key.encode('utf-8')).hexdigest()}"

    async def generate_explanation(self, error_text: str, correct_text: str, category: str, target_language: str, cefr_level: CEFRLevel, ui_language: str) -> str:
        cache_key = self._generate_cache_key(error_text, correct_text, category, target_language, ui_language)

        # 1. Check Distributed Cache
        cached_val = await self._cache_service.get(cache_key)
        if cached_val:
            return cached_val

        # 2. Generate
        prompt = f"..." # Omitted for brevity
        try:
            explanation = await self._ai_provider.generate_content(prompt=prompt, system_instruction="...")
            explanation = explanation.strip() or f"The correct form is: {correct_text}"

            # 3. Store in Cache with TTL (e.g., 7 days)
            await self._cache_service.set(cache_key, explanation, ttl_seconds=604800)
            return explanation
        except Exception:
            return f"The correct form is: {correct_text}"
```

#### Blueprint 2: Eliminating Blocking Operations in Event Loop (Critical)
*Issue: Synchronous `wave.open()` and `io.BytesIO` in async contexts block the main thread.*
**Solution:** Offload blocking I/O to a threadpool.

```python
# Inside TextToSpeechService or WebSocket routers
import asyncio
import io
import wave

async def synthesize_wav_non_blocking(voice, clean_text: str) -> bytes:
    """Runs the blocking Piper TTS synthesis in a separate thread."""
    def _blocking_synth():
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wav_file:
            voice.synthesize_wav(clean_text, wav_file)
        return wav_io.getvalue()

    return await asyncio.to_thread(_blocking_synth)

async def get_audio_duration_non_blocking(audio_bytes: bytes) -> float:
    """Runs blocking wave file inspection in a separate thread."""
    def _blocking_duration():
        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as wav:
                frames = wav.getnframes()
                rate = wav.getframerate()
                return frames / float(rate)
        except Exception:
            return 2.0

    return await asyncio.to_thread(_blocking_duration)
```

#### Blueprint 3: Fixing N+1 Query in `list_missions` (High)
*Issue: Querying mission attempts inside a for loop.*
**Solution:** Use SQLAlchemy's `selectinload` or perform a single query with an `IN` clause.

```python
# Refactoring MissionRepository to fetch missions and user's best attempts in a single optimized query
from sqlalchemy import select, func
from sqlalchemy.orm import aliased

class MissionRepository:
    # ...
    async def list_available_with_user_stats(self, cefr_level: str, user_id: uuid.UUID, skip: int, limit: int):
        from app.models.mission import Mission
        from app.models.user_mission_attempt import UserMissionAttempt

        # Subquery to find best score and completion status per mission for the user
        stats_subq = (
            select(
                UserMissionAttempt.mission_id,
                func.max(UserMissionAttempt.score).label("best_score"),
                func.count(UserMissionAttempt.id).label("attempt_count")
            )
            .filter(UserMissionAttempt.user_id == user_id, UserMissionAttempt.status == "completed")
            .group_by(UserMissionAttempt.mission_id)
            .subquery()
        )

        query = (
            select(Mission, stats_subq.c.best_score, stats_subq.c.attempt_count)
            .outerjoin(stats_subq, Mission.id == stats_subq.c.mission_id)
            .filter(Mission.cefr_level_min <= cefr_level)
            .offset(skip).limit(limit)
        )

        result = await self._session.execute(query)
        rows = result.all()

        # Transform rows directly into responses
        return [
            MissionResponse(
                id=row.Mission.id,
                title=row.Mission.title,
                # ... Map other fields
                completed_before=(row.attempt_count is not None and row.attempt_count > 0),
                best_score=row.best_score
            )
            for row in rows
        ]
```
