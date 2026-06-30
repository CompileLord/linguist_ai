import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from app.models.tutor_session import TutorSession
from app.models.user_mission_attempt import UserMissionAttempt
from app.repositories.interfaces.mission import AbstractMissionRepository, AbstractMissionAttemptRepository
from app.repositories.interfaces.tutor import AbstractTutorSessionRepository, AbstractTutorMessageRepository
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.services.interfaces.tutor import AbstractMissionService, AbstractMissionFeedbackService
from app.core.exceptions import ForbiddenException, MissionNotFoundError, AttemptNotFoundError, SessionNotFoundError

class MissionService(AbstractMissionService):
    def __init__(
        self,
        mission_repo: AbstractMissionRepository,
        attempt_repo: AbstractMissionAttemptRepository,
        session_repo: AbstractTutorSessionRepository,
        message_repo: AbstractTutorMessageRepository,
        profile_repo: AbstractProfileRepository,
        feedback_service: AbstractMissionFeedbackService
    ) -> None:
        self._mission_repo = mission_repo
        self._attempt_repo = attempt_repo
        self._session_repo = session_repo
        self._message_repo = message_repo
        self._profile_repo = profile_repo
        self._feedback_service = feedback_service

    async def start_mission(self, user_id: uuid.UUID, mission_id: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
        mission = await self._mission_repo.get_by_id(mission_id)
        if not mission:
            raise MissionNotFoundError()

        profile = await self._profile_repo.get_by_user_id(user_id)
        if not profile:
            raise ForbiddenException(detail="User profile not found")

        level_map = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
        user_level_val = level_map.get(profile.current_level.value if profile.current_level else "A1", 1)
        min_level_val = level_map.get(mission.cefr_level_min.value if hasattr(mission.cefr_level_min, "value") else mission.cefr_level_min, 1)

        if user_level_val < min_level_val:
            raise ForbiddenException(detail="CEFR level requirement not met")

        attempt = UserMissionAttempt(
            user_id=user_id,
            mission_id=mission_id,
            transcript=[],
            status="in_progress",
            started_at=datetime.utcnow()
        )
        await self._attempt_repo.create(attempt)

        session = TutorSession(
            user_id=user_id,
            title=f"Mission: {mission.title}",
            topic_context={
                "type": "mission",
                "mission_id": str(mission_id),
                "attempt_id": str(attempt.id),
                "topic": mission.title,
                "scenario_prompt": mission.scenario_prompt
            },
            is_active=True,
            message_count=0,
            started_at=datetime.utcnow()
        )
        await self._session_repo.create(session)

        return session.id, attempt.id


    async def complete_mission(self, attempt_id: uuid.UUID) -> UserMissionAttempt:
        attempt = await self._attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise AttemptNotFoundError()

        attempt.status = "completed"
        attempt.completed_at = datetime.utcnow()

        sessions = await self._session_repo.list_by_user(attempt.user_id, include_ended=True)
        tutor_session = None
        for s in sessions:
            if s.topic_context and s.topic_context.get("attempt_id") == str(attempt_id):
                tutor_session = s
                break

        if tutor_session:
            if tutor_session.is_active:
                await self._session_repo.end_session(tutor_session.id)
            messages = await self._message_repo.list_by_session(tutor_session.id)
            transcript_dicts = [
                {
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.created_at.isoformat()
                }
                for m in messages
            ]
            attempt.transcript = transcript_dicts

            mission = await self._mission_repo.get_by_id(attempt.mission_id)
            profile = await self._profile_repo.get_by_user_id(attempt.user_id)
            
            if mission and profile:
                lang_name_map = {"en": "English", "ru": "Russian", "tg": "Tajik"}
                ui_lang = lang_name_map.get(profile.native_language_code, "Russian")
                level_str = profile.current_level.value if profile.current_level else "A1"
                
                feedback = await self._feedback_service.generate_feedback(
                    scenario_prompt=mission.scenario_prompt,
                    transcript=transcript_dicts,
                    cefr_level=level_str,
                    ui_language=ui_lang
                )
                attempt.feedback = json.dumps({
                    "task_completion_score": feedback.task_completion_score,
                    "accuracy_score": feedback.accuracy_score,
                    "vocabulary_score": feedback.vocabulary_score,
                    "fluency_score": feedback.fluency_score,
                    "summary": feedback.summary,
                    "strengths": feedback.strengths,
                    "weaknesses": feedback.weaknesses,
                    "improvement_suggestions": feedback.improvement_suggestions,
                    "score": feedback.score
                })
                attempt.score = feedback.score

        await self._attempt_repo.update(attempt)
        return attempt

    async def abandon_mission(self, attempt_id: uuid.UUID) -> UserMissionAttempt:
        attempt = await self._attempt_repo.get_by_id(attempt_id)
        if not attempt:
            raise AttemptNotFoundError()

        attempt.status = "abandoned"
        attempt.completed_at = datetime.utcnow()

        sessions = await self._session_repo.list_by_user(attempt.user_id, include_ended=True)
        for s in sessions:
            if s.topic_context and s.topic_context.get("attempt_id") == str(attempt_id) and s.is_active:
                await self._session_repo.end_session(s.id)
                break

        await self._attempt_repo.update(attempt)
        return attempt
