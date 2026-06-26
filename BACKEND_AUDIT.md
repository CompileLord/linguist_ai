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
While the directory structure suggests a clean separation, the implementation leaks concerns across boundaries. For instance, some API routers (e.g., `ws_speaking` in `app/api/routers/speaking.py`, `ws_tutor` in `app/api/routers/tutor.py`) embed substantial business logic, orchestrate multiple repositories, and even handle direct TTS/STT orchestration and WebSocket chunking. Furthermore, several routers and services instantiate database sessions directly (`async with db_manager.get_session()`), breaking the repository pattern's abstraction and making unit testing difficult. Examples include `app/api/routers/vocabulary.py`, `writing_exam.py`, `listening_exam.py`, and `coach.py`.

**Data Lifecycle:**
Incoming requests hit FastAPI routers, where Pydantic schemas validate payloads. Routers use FastAPI `Depends` to inject services/repositories. Services process the request (often communicating with external AI models via `AbstractAIProvider`) and call repositories to persist data via SQLAlchemy's `AsyncSession`. While the general flow is solid, the manual management of sessions within some services bypasses the intended request-scoped transaction lifecycle.

---

## 2. High-Risk Logical Issues & Edge Cases

*   **Leaking Abstractions in API Layer:**
    *   Many FastAPI endpoints (e.g. in `vocabulary.py`, `writing_exam.py`, `listening_exam.py`, `coach.py`, `review.py`) directly import `db_manager` or raw SQLAlchemy `select`, `func` utilities to execute queries (often for counting records) inline inside the HTTP handler.
    *   *Risk:* This tightly couples the API layer to the specific database schema, bypassing the established repository pattern and making testing/mocking impossible without a live DB connection.
*   **Missing Database Transaction Boundaries (`commit` bypassing):**
    *   Services like `LessonScoringService` (`calculate_score`) directly access a repository's protected `_session` attribute (`self._user_lesson_repository._session.commit()`).
    *   *Risk:* Directly manipulating private session objects from the service layer breaks encapsulation and risks partial commits or transaction deadlocks if other repositories were manipulated during the same request.
*   **Unsafe Broad Exception Handlers in WebSockets:**
    *   Both `app/api/routers/tutor.py` and `speaking.py` use broad `except Exception:` blocks that simply invoke `pass` or log minimal errors on disconnects or unknown failures.
    *   *Risk:* Memory leaks from unclosed socket connections and difficulty debugging runtime failures.

---

## 3. Performance Bottlenecks & Scalability Blindspots

*   **Unbounded Query Computations in Services:**
    *   `AchievementEvaluationEngine` fetches large datasets into memory using `select(func.count(UserLesson.id))` across *all* user attempts continuously during every progress evaluation. It does this synchronously during hot paths (like finishing a speaking session).
*   **Excessive Instantiations inside Loops:**
    *   In `UserActivityAggregationService`, inside the loop fetching `UserLesson` history, there are multiple sub-queries triggered implicitly. Similar issues exist in `dashboard_analytics_service.py`.
*   **Inefficient Pagination Implementations:**
    *   In `listening_exam.py` (`list_available_listening_exams`), the API executes a complex `NOT IN` subquery against `UserListeningAttempt` which requires a full scan against all user attempts. This will degrade linearly as the user does more exams.
*   **Missing Application-Level Caching for AI Results:**
    *   In `WritingPromptGenerationService`, the AI generates prompts based on level and goal. There is no cache; every single request for `/exams/writing/prompt` hits the Vertex AI API, leading to extreme latency and unbounded Google Cloud API costs.

---

## 4. Code Maintenance & Modernization Opportunities

*   **Repository Consolidation:**
    *   The `count()` operations scattered across `routers/` should be moved to their respective Repository classes (e.g., `VocabularyRepository.count_by_level()`). This DRYs up the code and restores the Domain layer isolation.
*   **Unit of Work Pattern (UoW):**
    *   Since services coordinate multiple repositories (e.g., updating user stats, streaks, gamification points, and lesson status), the codebase desperately needs a `UnitOfWork` manager. Currently, each repository relies on its own injected session, and manual `session.commit()` calls are prone to race conditions if one update fails after another has committed.
*   **Background Tasks Refactoring:**
    *   In `lesson_scoring_service.py`, `BackgroundTasks` are used, but if not provided, it falls back to raw `asyncio.create_task()` which lacks error context and can mask fatal runtime exceptions. Moving this to a message queue (like Celery or Redis Queue) would be much safer.

---

## 5. Actionable Roadmap & Priority Matrix

| Component/File | Issue Summary | Impact Severity | Effort to Fix |
| :--- | :--- | :--- | :--- |
| `app/api/routers/*.py` (Multiple) | Raw SQLAlchemy queries executed directly inside API routers (e.g., `func.count()`), bypassing repositories. | **High** | Medium |
| `app/services/lesson_scoring_service.py` | Direct mutation of private `_session` attribute (`self._user_lesson_repository._session.commit()`). | **High** | Low |
| `app/api/routers/listening_exam.py` | Costly `NOT IN` subquery scaling linearly with user activity history. | **Medium** | Low |
| `app/services/writing_exam_service.py` | No application-level caching for AI prompt generation, resulting in massive cloud API overhead. | **Medium** | Low |
| `app/api/routers/tutor.py`, `speaking.py` | Silent catch-all exception swallowing (`except Exception: pass`) in WebSockets. | **Medium** | Low |


### Production-Ready Refactoring Blueprints for Top Issues

#### Blueprint 1: Restoring Repository Encapsulation (High)
*Issue: Routers running raw SQL counts instead of using Repositories.*
**Solution:** Move the counting logic to the repository layer.

```python
# In app/repositories/vocabulary_repository.py
from sqlalchemy import select, func

class VocabularyRepository(BaseRepository):
    # ...
    async def count_by_language_and_level(self, language_id: uuid.UUID, cefr_level: CEFRLevel) -> int:
        query = select(func.count(Vocabulary.id)).filter(
            Vocabulary.language_id == language_id,
            Vocabulary.cefr_level == cefr_level
        )
        result = await self._session.execute(query)
        return result.scalar() or 0

# In app/api/routers/vocabulary.py
@router.get("", response_model=PaginatedVocabularyResponse)
async def list_vocabulary(
    # ...
    vocab_repo: VocabularyRepository = Depends(get_vocabulary_repository)
):
    skip = (page - 1) * per_page
    if cefr_level:
        items = await vocab_repo.list_by_cefr_level(language_id, cefr_level, skip=skip, limit=per_page)
        # Replacing the raw SQL with the repository method
        total = await vocab_repo.count_by_language_and_level(language_id, cefr_level)
    # ...
```

#### Blueprint 2: Removing Private Session Access in Services (High)
*Issue: `LessonScoringService` calls `.commit()` on a private repository attribute.*
**Solution:** Expose a generic save/commit method in the base repository or use the Unit of Work pattern.

```python
# In app/repositories/base.py
class BaseRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save_changes(self) -> None:
        """Safely commits changes tracked by the current session."""
        try:
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

# In app/services/lesson_scoring_service.py
class LessonScoringService:
    # ...
    async def calculate_score(self, ...):
        # ... logic ...

        # Replace: await self._user_lesson_repository._session.commit()
        # With:
        await self._user_lesson_repository.save_changes()

        # ...
```

#### Blueprint 3: Optimizing the `NOT IN` Subquery (Medium)
*Issue: `listening_exam.py` router performs a slow `NOT IN` query for available exams.*
**Solution:** Use an `OUTER JOIN` and filter for `NULL` to find unattempted exams more efficiently, and move it to the repository.

```python
# In app/repositories/listening_exam_repository.py
async def count_available_exams(self, user_id: uuid.UUID, language_id: uuid.UUID, level: str) -> int:
    from app.models.user_listening_attempt import UserListeningAttempt

    query = (
        select(func.count(ListeningExam.id))
        .outerjoin(
            UserListeningAttempt,
            (ListeningExam.id == UserListeningAttempt.exam_id) & (UserListeningAttempt.user_id == user_id)
        )
        .filter(
            ListeningExam.language_id == language_id,
            ListeningExam.level == level,
            UserListeningAttempt.id.is_(None) # Only exams with no matching attempt
        )
    )
    result = await self._session.execute(query)
    return result.scalar() or 0
```
