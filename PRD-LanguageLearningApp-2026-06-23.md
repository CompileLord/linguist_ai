# PRD: AI Language Learning Platform (MVP)

**Version:** 1.0
**Date:** June 23, 2026
**Status:** Draft for Review

---

## 1. Product Overview and Objectives

### 1.1 Description
A web platform for learning English with AI-driven personalized instruction. The system generates lessons, vocabulary, exercises, and evaluates user progress using LLMs (Google Vertex AI via the `google-genai` SDK) rather than pre-created static content.

Core principle: **content, repetitions, errors, and recommendations are generated individually for each user** based on their actual proficiency level, goals, and error history — not following a one-size-fits-all script.

### 1.2 Target Audience
- Geography: Tajikistan, Russia, Uzbekistan (with potential for expansion)
- Application interface is available in three languages: Tajik, Russian, English — the user selects their explanation language during registration
- In the MVP, the target (studied) language is **English** only
- Individual users (B2C), with no school/organization integration at this stage

### 1.3 Business Model
**Free forever** at launch:
- All core functionality is free with no time restrictions
- AI Speaking (voice sessions with AI) is limited to **5 minutes per day** per user — this is the most expensive feature (STT + LLM + TTS in real-time)
- Other AI features (tutor chat, lesson generation, exams) — no hard limits at launch, but with reasonable default protective quotas (see section 10.4) to prevent abuse and uncontrolled API costs
- Monetization (paid plans) — out of scope for the MVP; include a `subscription_tier` field in the data model architecture, but do not implement payment logic

---

## 2. Target Audience and Use Cases

| Scenario | Description |
|---|---|
| New user | Registers, selects interface language, takes placement test, chooses learning goal, receives first personalized lesson |
| Regular user | Logs in daily, completes generated lessons, practices vocabulary through spaced repetition, chats with AI Tutor about unclear topics |
| Active practitioner | Uses Real World Missions (role-play dialogues) and Speaking sessions (within the daily limit) |
| Exam-preparing user | Selected IELTS/TOEFL as a goal, takes Writing and Listening Exams, receives detailed error reports |
| Returning user | Receives a weekly AI Coach report with recommendations, views streak and achievements |

---

## 3. Core Features (MVP — 14 Modules)

### 3.1 Multi-Language Architecture (Infrastructure Foundation)
**Description:** The data system does not hardcode English — the structure must support multiple target languages from the start, even though only English is active in the MVP.

**Logic:**
- Hierarchy: `Language → Level (A1, A2, B1, B2, C1) → Module → Lesson`
- `Level` uses the Common European Framework of Reference (CEFR) as the base difficulty system
- In the MVP, a single `Language = English` record is created in the database, but the data model must not have hard constraints (enum) on language — only a reference table `languages`, extensible without schema migrations

**Acceptance Criteria:**
- Adding a new language to the system requires no code changes — only a new record in the `languages` table + content generation via AI Lesson Generator
- UI language (interface language) and target language (studied language) are independent entities in the data model

---

### 3.2 Registration and Level Assessment (Placement Test)
**Description:** During registration, the user selects an interface language (Tajik/Russian/English) and takes a test to determine their current English level.

**Workflow:**
1. Registration: username + password (no email/OAuth in MVP)
2. Selection of interface language (stored as `ui_language` in the profile)
3. Level assessment method selection:
   - Self-selection of level (Beginner / Elementary / Intermediate / Advanced)
   - OR a short diagnostic test (10–15 grammar/vocabulary questions, adaptive difficulty — the next question is selected based on the correctness of the previous answer)
4. The result maps to a CEFR level (A1–C1) and is saved in the user profile
5. Voice interview with AI (mentioned in the original spec) — moved to Phase 2 as an accuracy improvement; in the MVP — text-based test only

**Data Model:**
- `users`: id, username (unique), password_hash, ui_language, created_at
- `user_profile`: user_id, current_level (enum: A1–C1), placement_method (enum: self_selected/test), target_language_id

**Acceptance Criteria:**
- A user cannot proceed to lessons without completing level selection
- The test takes no more than 5 minutes, and the result is displayed immediately with an explanation of the level

---

### 3.3 Learning Goals
**Description:** During registration (after the test), the user selects one or more goals that influence the theme of generated content and vocabulary.

**Goal Options:** Travel, Work, Programming, Business, IELTS, TOEFL, School, University, Daily Communication

**Logic:**
- Goals are saved in the profile and passed as context in AI Lesson Generator and AI Tutor prompts — for example, with the "IELTS" goal, the system prioritizes academic vocabulary and question formats; with "Travel" — everyday situations
- The user can change goals in settings at any time — this recalculates recommendations for future lessons (does not rewrite already completed ones)

**Data Model:**
- `user_goals`: user_id, goal (enum), priority (int, for cases with multiple goals)

**Acceptance Criteria:**
- A minimum of 1 goal is required during registration, maximum 3
- Changing goals is reflected in the content of the next generated lesson

---

### 3.4 AI Lesson Generator
**Description:** The central generative engine of the system. Given a set of parameters (topic, level, language, user goal), it automatically creates a complete lesson.

**Input Parameters:**
- Topic (e.g., "Present Perfect")
- Level (CEFR)
- Target language
- (optional) User learning goal — for adapting examples/vocabulary

**What is generated per call (structured JSON response from LLM):**
- Theory (grammar/topic explanation in the user's interface language)
- 5–8 usage examples
- List of new words (10–15) with translation, transcription
- Exercises (multiple choice / fill-the-gap) — 8–10 items
- Final quiz on the lesson topic (5 questions)
- A brief speaking task (for use in Real World Missions/AI Tutor)
- A short reading text on the topic
- Listening material (text script, subsequently voiced via Piper TTS in a separate call)

**Logic for Selecting the Next Topic (simplified for MVP):**
- Topics follow a predefined curriculum for each level (admin-curated topic list per CEFR level), but the order and pace adapt: if the user makes many mistakes on the current topic — the system inserts an additional review lesson before moving on
- A full ML-driven learning path personalization engine (learning speed analysis, complex error patterns) — deferred to Phase 2; in the MVP, a simplified rule: "% correct answers < 70% → review, otherwise → next topic in the curriculum"

**Technical Considerations:**
- Uses an affordable Vertex AI model (`gemini-2.5-flash`) for most generation tasks — high load, low error criticality
- Results are cached: the same Topic+Level can be reused across users with similar profiles (saving on API calls), with selective personalization of vocabulary/examples based on the user's goal

**Data Model:**
- `lessons`: id, language_id, level, topic, content (JSONB — stores all generated blocks), created_at, is_cached (bool)
- `user_lessons`: user_id, lesson_id, status (not_started/in_progress/completed), score, completed_at

**Acceptance Criteria:**
- Generation of one complete lesson fits within a reasonable response time (target SLA — to be finalized during technical evaluation, approximately 15–20 seconds with parallel block generation)
- If generation of one block fails (e.g., listening) — the remaining lesson blocks stay available, the failed block is marked as "retry available"

---

### 3.5 Smart Vocabulary System
**Description:** A centralized vocabulary store linked to each user's individual progress.

**What is stored per word (globally, not per-user):**
- Word, translation (in the user's ui_language), transcription, audio (TTS-generated, cached), usage examples, difficulty level (CEFR), language frequency rank

**What is stored per-user:**
- Knows/doesn't know the word (bool, updated based on exercise results)
- Repetition count
- Error count

**Logic:**
- New words are automatically added to the user's vocabulary from each completed lesson
- Audio for a word is generated once via Piper TTS and cached locally (Local Storage) — not regenerated for other users

**Data Model:**
- `vocabulary`: id, language_id, word, translation_context (JSONB by ui_language), transcription, audio_url, cefr_level, frequency_rank
- `user_vocabulary`: user_id, vocabulary_id, is_known (bool), repetitions_count, errors_count, last_reviewed_at

**Acceptance Criteria:**
- A word is not duplicated in the global `vocabulary` table when it reappears in different lessons — lookup by (language_id, word) is performed before insertion
- Audio for a word is generated no more than once

---

### 3.6 Spaced Repetition System
**Description:** Automated scheduling of word and grammar rule reviews based on a spaced repetition algorithm (recommendation: SM-2 or a simplified modification — does not require AI, purely algorithmic logic, which reduces costs).

**Logic:**
- For each (user, vocabulary_item) pair, the following is stored: date learned, date of last review, current interval, "mastery percentage" (derived from the history of correct/incorrect answers)
- On a correct answer — the interval until the next review increases (per the SM-2 formula); on an error — the interval resets to minimum
- Daily (or on user login) the system generates a "review queue" — a list of words/rules due for review today
- The review queue is displayed to the user as a separate "Review" module on the main screen

**Data Model:**
- `spaced_repetition_items`: user_id, item_type (enum: vocabulary/grammar_rule), item_id, learned_at, last_reviewed_at, next_review_at, interval_days, ease_factor, mastery_percent

**Acceptance Criteria:**
- The algorithm runs entirely on the backend without LLM calls (pure math — no AI costs for this feature)
- The user sees the count of items "due for review today" on the main screen

---

### 3.7 AI Live Tutor (AI Chat Tutor)
**Description:** A chat interface available to the user at any time, where they can ask questions to an AI tutor.

**Features:**
- Explanation of grammar rules
- Requesting additional examples
- Requesting additional exercises on a topic
- Free-form questions about the language

**Logic:**
- Implemented via a WebSocket connection between the Next.js frontend and FastAPI backend for streaming LLM responses — provides the feel of a "live" conversation
- Conversation context is maintained within a session (history of the last N messages is passed in the prompt); long-term memory between sessions (AI Conversation Memory from the original spec) — Phase 2
- User context is passed in the system prompt: current level, active lesson topic, learning goal, ui_language — so that answers are in a language and complexity appropriate for the user

**Technical Considerations:**
- Uses an affordable model (`gemini-2.5-flash`) for most dialogues; possible fallback to a higher-quality model for complex requests (determined by heuristics: history length, presence of specific keywords like "explain in detail", "why")

**Data Model:**
- `tutor_sessions`: id, user_id, started_at, context_lesson_id (nullable)
- `tutor_messages`: session_id, role (user/assistant), content, created_at

**Acceptance Criteria:**
- Response starts streaming to the user within 2–3 seconds of message submission (the perception of fast response is more important than full generation completion)
- Chat history is saved and accessible for review within the current study session

---

### 3.8 Real World Missions
**Description:** Practical role-play assignments where AI acts as a conversation partner in a simulated real-life situation.

**Example Missions:** ordering food at a restaurant, going through a job interview, buying a ticket, booking a hotel, giving a presentation, meeting a new person

**Logic:**
- Technically reuses the AI Live Tutor engine (same chat mechanism), but with a predefined system prompt role and scenario for each mission
- At the end of a mission, AI generates a brief assessment: how well the user accomplished the communicative task, which phrases could have been used differently
- Missions are linked to the user's learning goals (e.g., goal "Travel" → unlocks travel-related missions)

**Data Model:**
- `missions`: id, title, scenario_prompt, related_goal (enum), cefr_level_min
- `user_mission_attempts`: user_id, mission_id, transcript (JSONB), feedback, completed_at

**Acceptance Criteria:**
- A mission concludes with textual feedback to the user (not just "end of dialogue")
- Available missions are filtered by the user's current level and goals

---

### 3.9 AI Writing Exam
**Description:** The user writes an essay on a given topic, and AI evaluates the text against multiple criteria.

**Logic:**
- The system suggests a topic (considering the user's goal — e.g., IELTS-style prompt for those preparing for IELTS)
- The user enters text (textarea, no time limit in the MVP)
- The LLM analyzes and returns a structured assessment by criteria: grammar, vocabulary, text cohesion, naturalness of speech, overall style
- The result includes a score per criterion + an overall score + specific recommendations with correction examples

**Data Model:**
- `writing_exams`: id, user_id, prompt, submitted_text, scores (JSONB: grammar, vocabulary, cohesion, naturalness, style), overall_score, feedback_text, created_at

**Acceptance Criteria:**
- The assessment is returned in a structured format suitable for displaying a criteria-by-criteria breakdown (not just a paragraph of text)
- The text and assessment are saved in the user's history for tracking progress over time

---

### 3.10 AI Listening Exam
**Description:** Generation of audio material followed by comprehension questions.

**Logic:**
1. AI Lesson Generator (or a separate call) creates a text script of appropriate difficulty (CEFR level)
2. The text is voiced via Piper TTS
3. The user listens to the audio (without the ability to read the transcript during playback — critical for test integrity)
4. Afterwards — answers comprehension questions (multiple choice)
5. The system displays the result + transcript for self-review

**Technical Considerations:**
- TTS audio is cached (the same generated script can be reused for multiple users of the same level — saving on TTS calls)

**Data Model:**
- `listening_exams`: id, language_id, level, script_text, audio_url, questions (JSONB)
- `user_listening_attempts`: user_id, exam_id, answers (JSONB), score, completed_at

**Acceptance Criteria:**
- Audio is generated once and reused, not regenerated on each attempt
- The transcript is hidden from the user until the test is completed

---

### 3.11 AI Error Correction Engine (Grammar + Vocabulary)
**Description:** After each user response/action (exercise, writing, chat), the system analyzes and records errors in a structured format — this is the foundation for personalization (spaced repetition reviews, AI Coach reports).

**Categories in the MVP:** Grammar, Vocabulary (Pronunciation/Writing/Listening as separate error categories — Phase 2, partially covered through writing/listening exams above)

**Logic:**
- On each incorrect answer in an exercise or detected error in free text (writing, chat) — an error record is created
- Stored: the error itself (what the user wrote), the correct variant, an explanation (generated briefly by LLM), a repetition counter for the same error
- If the same error category recurs (e.g., confusing Present Perfect / Past Simple) — this is forwarded as a signal to AI Lesson Generator to prioritize the review topic

**Data Model:**
- `user_errors`: id, user_id, category (enum: grammar/vocabulary), error_text, correct_text, explanation, related_lesson_id (nullable), occurrence_count, last_occurred_at

**Acceptance Criteria:**
- Each recorded error contains a clear explanation in the user's ui_language
- Recurring errors of the same type are aggregated (occurrence_count++), not creating duplicate records

---

### 3.12 Gamification (XP, Levels, Streak)
**Description:** Game mechanics to increase engagement.

**Logic:**
- XP is awarded for: completing a lesson, passing an exercise, passing an exam, daily login
- User Level (gamification level, separate from the CEFR level) grows by accumulating XP according to a simple threshold table
- Streak — a counter of consecutive days with activity; resets if the user misses a day (with a possible "freeze streak" feature for Phase 2)

**Data Model:**
- `user_gamification`: user_id, total_xp, current_game_level, current_streak, longest_streak, last_activity_date

**Acceptance Criteria:**
- XP is awarded atomically together with the action (no desynchronization between lesson completion and XP award)
- Streak correctly accounts for the user's timezone when determining a "new day"

---

### 3.13 Achievement System
**Description:** Badges/achievements for specific milestones, extending gamification with minimal additional development.

**Examples:** 10 lessons in a row, 100 learned words, 50 minutes of speaking practice, first week without missing a day

**Logic:**
- Implemented via a set of rules (triggers) checked after key events (lesson completion, streak update, speaking hours accumulation)
- The list of achievements is a static configuration (admin-defined), does not require AI

**Data Model:**
- `achievements`: id, code, title, description, condition_type (enum), condition_value
- `user_achievements`: user_id, achievement_id, unlocked_at

**Acceptance Criteria:**
- An achievement is awarded no more than once per user
- The user receives an in-app notification immediately upon unlock (at the moment of the event, not on the next login)

---

### 3.14 AI Coach (Weekly Report)
**Description:** Once a week, AI generates a personalized progress report for the user.

**Logic:**
- A backend task (scheduled job) aggregates user data weekly: completed lessons, accumulated errors (from Error Correction Engine), exam results, spaced repetition activity
- The aggregated data is passed to the LLM as structured context, based on which a report is generated: strengths, weaknesses, recommendations, suggested plan for the next week
- The report is displayed in the app (under "Progress" section / notification)

**Technical Considerations:**
- This is a low-frequency AI call (once a week per user) — a higher-quality model (`gemini-2.5-pro`) can be used; costs are predictable and low even as the user base grows

**Data Model:**
- `weekly_reports`: id, user_id, period_start, period_end, strengths (text), weaknesses (text), recommendations (text), generated_at

**Acceptance Criteria:**
- The report is generated automatically on schedule, without requiring a user request
- If the user has insufficient activity for the week — the report is generated with appropriately soft wording (not an empty/error report)

---

## 4. Technology Stack (Recommendations)

| Layer | Technology | Rationale |
|---|---|---|
| Backend | FastAPI (Python) with full OOP architecture | Async-native, well-suited for I/O-heavy workloads (numerous external AI API calls), built-in validation via Pydantic, class-based services/repositories/controllers following SOLID principles |
| Frontend | Next.js | SSR/SSG for performance, mature ecosystem, convenient for WebSocket integrations |
| Real-time Layer | WebSocket (via FastAPI + Next.js client) | Required for AI Live Tutor, Real World Missions, and potentially the Speaking mode — provides a streaming conversation experience |
| Database | PostgreSQL (async via asyncpg + SQLAlchemy async) | Relational model well describes the structure (users, lessons, vocabulary, errors), JSONB fields cover the need for flexible AI-generated structures without a separate NoSQL DB |
| Migrations | Alembic | Schema versioning and migration management for PostgreSQL |
| AI / LLM SDK | `google-genai` (`pip install google-genai`) | Unified Google Gen AI SDK; client initialized via `from google import genai; client = genai.Client(vertexai=True, project=PROJECT_ID, location='us-central1')` |
| AI Models | `gemini-2.5-flash` (default), `gemini-2.5-pro` (high-accuracy) | Flash for most generation tasks (lessons, exercises, chat, error correction); Pro only for AI Coach weekly reports and Writing Exam final grading where accuracy is critical |
| AI Content Generation | `client.models.generate_content()` with structured output | `response_mime_type='application/json'` + `response_schema=PydanticModel` for type-safe structured responses; `client.models.generate_content_stream()` for streaming (AI Tutor, Missions) |
| Speech-to-Text | Google Cloud STT (`google-cloud-speech`) | For voice input (Speaking mode) |
| Text-to-Speech | Piper TTS (Local) | For word audio, listening exams, dialogue voicing |
| Backend Hosting | VPS (budget provider) | Reduces base infrastructure cost compared to fully managed GCloud |
| AI Call Hosting | Google Cloud (Vertex AI via google-genai, STT) | Only services requiring the Google ecosystem are used on GCloud — everything else runs on VPS for cost savings |
| File Storage (audio) | Local Storage | Caching generated TTS audio locally to avoid regeneration |
| Authentication | Username/password + hashing (bcrypt/argon2) + JWT sessions | Simple model per requirements; OAuth/email providers — Phase 2 |

**Alternative to keep in mind:** if WebSocket chat load grows, consider a managed message broker (Redis Pub/Sub) for horizontal scaling of WebSocket connections across multiple backend instances — architected as a future option, not required for a single-server MVP.

---

### 4.1 Backend Architecture Principles

#### 4.1.1 Project Structure (Layered Architecture)

The backend follows a strict layered architecture with clear separation of concerns:

```
app/
├── api/                    # API layer — route handlers (controllers)
│   ├── v1/
│   │   ├── auth.py
│   │   ├── lessons.py
│   │   ├── vocabulary.py
│   │   ├── tutor.py
│   │   ├── missions.py
│   │   ├── exams.py
│   │   ├── gamification.py
│   │   └── coach.py
│   └── dependencies.py     # Shared FastAPI Depends() providers
├── services/               # Business logic layer — service classes
│   ├── interfaces/          # Abstract base classes (ABCs) for all services
│   │   ├── ai_service.py
│   │   ├── lesson_service.py
│   │   ├── vocabulary_service.py
│   │   ├── tutor_service.py
│   │   ├── exam_service.py
│   │   └── ...
│   ├── ai_vertex_service.py # Concrete Vertex AI implementation
│   ├── lesson_service.py
│   ├── vocabulary_service.py
│   ├── spaced_repetition_service.py
│   ├── tutor_service.py
│   ├── mission_service.py
│   ├── exam_service.py
│   ├── gamification_service.py
│   ├── coach_service.py
│   └── error_correction_service.py
├── repositories/           # Data access layer — repository classes
│   ├── interfaces/          # Abstract base classes for repositories
│   │   └── ...
│   ├── user_repository.py
│   ├── lesson_repository.py
│   ├── vocabulary_repository.py
│   └── ...
├── models/                 # SQLAlchemy ORM models (database tables)
│   ├── user.py
│   ├── lesson.py
│   ├── vocabulary.py
│   └── ...
├── schemas/                # Pydantic models (request/response DTOs)
│   ├── user.py
│   ├── lesson.py
│   ├── vocabulary.py
│   └── ...
├── core/                   # Cross-cutting concerns
│   ├── config.py            # Application settings (Pydantic BaseSettings)
│   ├── database.py          # Async SQLAlchemy engine/session setup
│   ├── security.py          # JWT, password hashing utilities
│   └── exceptions.py        # Custom exception hierarchy
└── main.py                 # FastAPI application entry point
```

Each layer depends only on the layer directly below it. The API layer depends on services; services depend on repositories; repositories depend on models. No layer may bypass an intermediate layer.

#### 4.1.2 SOLID Compliance Rules

All backend code must adhere to SOLID principles:

- **Single Responsibility Principle (SRP):** Each class has exactly one reason to change. A service class handles business logic only; a repository handles data access only; an API route handler orchestrates request/response only.
- **Open/Closed Principle (OCP):** Classes are open for extension but closed for modification. New AI providers, exam types, or gamification rules are added by creating new classes implementing existing interfaces, not by modifying existing ones.
- **Liskov Substitution Principle (LSP):** Any concrete implementation can replace its abstract base class without altering program correctness. For example, swapping `AIVertexService` for a hypothetical `AIOpenAIService` must not break any service consumer.
- **Interface Segregation Principle (ISP):** Abstract base classes define narrow, focused interfaces. A single monolithic `AIService` ABC is split into `LessonGeneratorInterface`, `TutorInterface`, `ExamGraderInterface`, etc., so consumers depend only on the capabilities they use.
- **Dependency Inversion Principle (DIP):** High-level modules (services) do not depend on low-level modules (concrete repositories). Both depend on abstractions (ABCs). All dependencies are injected via FastAPI's `Depends()` mechanism.

#### 4.1.3 Coding Standards

- **No comments in code.** Code must be self-documenting through descriptive naming of classes, methods, variables, and parameters. If a piece of code requires a comment to be understood, it must be refactored for clarity instead.
- **Type hints everywhere.** All function signatures, return types, and variable declarations must include type annotations. No `Any` types unless absolutely unavoidable.
- **Pydantic models for all request/response schemas.** No raw `dict` returns from API endpoints. Every request body and response body is defined as a Pydantic model in the `schemas/` directory.
- **Async throughout.** All I/O-bound operations (database queries, AI API calls, file storage) use `async`/`await`. Synchronous blocking calls are prohibited in the request path.
- **Dependency injection via `Depends()`.** All service and repository instances are injected through FastAPI's dependency injection system. No manual instantiation of services inside route handlers or other services.
- **Abstract base classes for all service interfaces.** Every service has a corresponding ABC in `services/interfaces/` that defines its public contract. Concrete implementations inherit from these ABCs.
- **Repository pattern for all data access.** Direct database queries in services are prohibited. All data operations go through repository classes that encapsulate query logic.

#### 4.1.4 AI Service Abstraction

The AI service layer is designed for provider independence through abstraction:

**Abstract Base Class:**
```python
from abc import ABC, abstractmethod
from schemas.lesson import GeneratedLessonContent
from schemas.exam import WritingExamFeedback

class AILessonGeneratorInterface(ABC):
    @abstractmethod
    async def generate_lesson(
        self,
        topic: str,
        level: str,
        target_language: str,
        user_goal: str | None,
        ui_language: str,
    ) -> GeneratedLessonContent: ...

class AIExamGraderInterface(ABC):
    @abstractmethod
    async def grade_writing_exam(
        self,
        prompt: str,
        submitted_text: str,
        user_level: str,
    ) -> WritingExamFeedback: ...
```

**Concrete Vertex AI Implementation (using `google-genai` SDK):**
```python
from google import genai
from core.config import settings
from schemas.lesson import GeneratedLessonContent
from services.interfaces.ai_service import AILessonGeneratorInterface

class AIVertexLessonGenerator(AILessonGeneratorInterface):
    def __init__(self) -> None:
        self._client = genai.Client(
            vertexai=True,
            project=settings.gcp_project_id,
            location=settings.gcp_location,
        )
        self._model = settings.ai_model_flash  # "gemini-2.5-flash"

    async def generate_lesson(
        self,
        topic: str,
        level: str,
        target_language: str,
        user_goal: str | None,
        ui_language: str,
    ) -> GeneratedLessonContent:
        response = self._client.models.generate_content(
            model=self._model,
            contents=self._build_prompt(topic, level, target_language, user_goal, ui_language),
            config={
                "response_mime_type": "application/json",
                "response_schema": GeneratedLessonContent,
            },
        )
        return GeneratedLessonContent.model_validate_json(response.text)
```

**Streaming for AI Tutor / Real World Missions:**
```python
stream = client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents=conversation_history,
)
for chunk in stream:
    await websocket.send_text(chunk.text)
```

**Model Selection Strategy:**
- `gemini-2.5-flash` — default for all high-frequency generation: lessons, exercises, tutor chat, error correction explanations, mission dialogues
- `gemini-2.5-pro` — reserved for low-frequency, high-accuracy tasks: AI Coach weekly reports, Writing Exam final grading (accuracy of assessment is critical for user trust)

---

## 5. Conceptual Data Model (Summary)

Main entities and relationships (field details — in sections 3.1–3.14 above):

```
users 1---1 user_profile
users 1---N user_goals
users 1---N user_lessons N---1 lessons
users 1---N user_vocabulary N---1 vocabulary
users 1---N spaced_repetition_items
users 1---N tutor_sessions 1---N tutor_messages
users 1---N user_mission_attempts N---1 missions
users 1---N writing_exams
users 1---N listening_exams (via user_listening_attempts)
users 1---N user_errors
users 1---1 user_gamification
users 1---N user_achievements N---1 achievements
users 1---N weekly_reports
```

All tables storing AI-generated content of variable structure (lessons.content, mission feedback, exam scores) use **JSONB** in PostgreSQL — this provides flexibility without needing to change the DB schema every time the AI response format changes.

---

## 6. Interface Design Principles (Conceptual, Without Styles)

> Per request — this PRD describes only the functional logic of screens. Visual design (colors, typography, components) will be developed separately after this document is approved.

Functionally, the interface must include the following main screens/areas:
1. **Registration / Interface language selection / Placement test** — sequential onboarding flow
2. **Main screen (Dashboard)** — current lesson, review queue, streak/XP, quick access to AI Tutor
3. **Lesson screen** — sequential completion of blocks (theory → vocabulary → exercises → quiz)
4. **AI Tutor Chat** — always accessible (e.g., as a floating button/separate tab)
5. **Real World Missions** — list of available missions + dialogue screen
6. **Exams** (Writing/Listening) — separate sections with attempt history
7. **Progress / Profile** — XP, achievements, weekly AI Coach reports, goal settings

---

## 7. Security Considerations

- Passwords are stored only as hashes (bcrypt or argon2), never in plaintext
- Sessions — via JWT with limited lifetime + refresh token mechanism
- Rate limiting at the API endpoint level for AI calls (especially Speaking — to enforce the 5-minute daily limit, and to protect against abuse on other AI features)
- Validation and sanitization of user input before passing it to LLM prompts (protection against prompt injection in fields like writing exam submissions, chat messages)
- HTTPS is mandatory for all connections (including WebSocket — WSS)
- Since authentication is simple (username/password without email recovery in MVP) — an access recovery mechanism is needed as a fallback (e.g., via support/admin panel); this must be explicitly resolved before launch, otherwise users who forget their password will be unable to recover access

---

## 8. Development Milestones

**Milestone 0 — Infrastructure and Core Architecture**
FastAPI + PostgreSQL + Next.js setup, deployment pipeline on VPS, Vertex AI/STT/Piper TTS integration, basic authentication

**Milestone 1 — Onboarding and Content Engine**
Registration → placement test → goals (3.2, 3.3) + AI Lesson Generator (3.4) + Multi-language architecture (3.1)

**Milestone 2 — Learning and Memory**
Smart Vocabulary (3.5) + Spaced Repetition (3.6) + Error Correction Engine (3.11)

**Milestone 3 — Interactivity**
AI Live Tutor (3.7, including WebSocket layer) + Real World Missions (3.8)

**Milestone 4 — Knowledge Assessment**
AI Writing Exam (3.9) + AI Listening Exam (3.10)

**Milestone 5 — Engagement and Retention**
Gamification (3.12) + Achievement System (3.13) + AI Coach (3.14)

**Milestone 6 — Stabilization**
Load testing of AI costs, fine-tuning of limits (section 10.4), prioritization of cheap/expensive models based on actual usage, bug fixes before launch

---

## 9. Potential Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Uncontrolled cost growth for Vertex AI/STT as the user base grows | Hard limits on Speaking (5 min/day), caching TTS audio and frequently requested lesson content, using affordable models by default, cost monitoring with budget overage alerts |
| Response delay when generating a full lesson (multiple sequential AI calls) | Parallelization of independent generation blocks (vocabulary, exercises, reading can be generated simultaneously, not sequentially), caching across users of the same level |
| WebSocket connections don't scale under load on a single VPS instance | Architecturally allow for adding Redis Pub/Sub for horizontal scaling in the future (do not implement in MVP, but do not block this possibility through technology choices) |
| Quality of AI-generated content (grammatical errors in the lessons themselves) | In MVP — selective manual review by an administrator of generated content before publishing to a wide audience (AI Content Review from the original spec — partial, in a lightweight manual form); fully automated AI review — Phase 2 |
| Password recovery with simple username/password authentication | Resolve before launch: either security questions, or a mandatory backup email during registration (without OAuth), or admin-assisted recovery |
| AI Tutor chat abuse (flooding, irrelevant requests) | Default daily message limits (see 10.4), moderation at the prompt level (system instructions restrict response topics) |

---

## 10. Additional Technical Details

### 10.1 AI Model Selection Approach
- **Affordable/fast models** (`gemini-2.5-flash`, default): lesson generation, exercises, regular AI Tutor chat, error correction explanations
- **Higher-quality models** (`gemini-2.5-pro`, selective): AI Coach weekly report (low call frequency — once per week per user), Writing Exam final grading (assessment accuracy is critical for user trust)

### 10.2 Caching as a Cost Reduction Strategy
- TTS audio: cached by text, not regenerated
- Generated lessons: cached by (topic, level, language) with selective personalization on top of the cache (e.g., replacing several examples to match the user's goal, rather than full regeneration)
- Listening exam scripts: cached and reused across users of the same level

### 10.3 WebSocket — Where It Is Used
- AI Live Tutor (response streaming via `generate_content_stream()`)
- Real World Missions (real-time dialogue)
- AI Speaking sessions (if voice mode is implemented as a continuous stream rather than individual request-response)

### 10.4 Usage Limits (Default Quotas — Recommendations for Further Tuning)
Since a definitive decision on limits is deferred, the following are **reasonable starting values** that can be easily changed via configuration (not hardcoded):

| Feature | Proposed Default Limit |
|---|---|
| AI Speaking | 5 minutes/day (hard limit, agreed upon) |
| AI Live Tutor (messages) | ~50 messages/day |
| AI Lesson Generator (new lessons) | ~10 new lessons/day (retaking existing ones — unlimited) |
| Writing Exam (attempts) | ~3 attempts/day |
| Listening Exam (attempts) | ~5 attempts/day |
| Real World Missions | ~10 missions/day |

These values must be stored in a configuration table/environment variables, not in code — so they can be adjusted promptly based on actual observed costs after launch.

---

## 11. Future Expansion Possibilities (Phase 2+)

- Full ML-driven learning path personalization engine (replacing the simplified "% errors → review" rule)
- Shadowing Mode (pronunciation analysis through comparison with the original)
- AI Speaking Exam (full exam with oral speech assessment)
- Voice interview for level determination during registration
- Community Mode (partner matching for practice, conversation clubs, leaderboards)
- Teacher Dashboard (B2B functionality for teachers/schools)
- Full AI Content Review (automated quality checking of generated lessons)
- AI Conversation Memory (long-term dialogue memory between sessions, including across days/weeks)
- Personalized Review Lessons as a separate module (beyond current coverage through spaced repetition + error correction)
- Learning Analytics dashboard (aggregated analytics on difficult topics/words across the entire platform)
- Additional target languages beyond English
- Native mobile applications (iOS/Android)
- Paid subscription plans (monetization beyond the free tier)
- OAuth/email authentication and password recovery

---

## 12. Open Questions for the Development Team

1. Exact values for default limits (section 10.4) — finalize after evaluating actual API call costs in a testing environment
2. SLA for lesson generation time — requires technical evaluation after prototyping parallel AI calls
3. Password recovery mechanism — requires a decision before launch (section 9)
4. Specific topics/curriculum per CEFR level for English — an initial topic list (admin-curated) is needed, which the AI Lesson Generator will use as its foundation
