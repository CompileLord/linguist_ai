import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, AsyncIterator, Dict, Any
from app.models.user_profile import UserProfile
from app.models.user_mission_attempt import UserMissionAttempt
from app.schemas.tutor import RateLimitStatus
from app.schemas.mission import MissionFeedback

class AbstractTutorPromptBuilder(ABC):
    @abstractmethod
    def build(
        self,
        user_profile: UserProfile,
        learning_goals: List[str],
        active_lesson_topic: Optional[str] = None,
        session_title: Optional[str] = None
    ) -> str:
        pass

class AbstractSessionContextManager(ABC):
    @abstractmethod
    async def build_context(self, session_id: uuid.UUID, max_messages: int = 20) -> List[Dict[str, Any]]:
        pass

class AbstractTutorRateLimiter(ABC):
    @abstractmethod
    async def check_limit(self, user_id: uuid.UUID) -> RateLimitStatus:
        pass

    @abstractmethod
    async def increment(self, user_id: uuid.UUID) -> None:
        pass

class AbstractTutorService(ABC):
    @abstractmethod
    async def process_message(
        self,
        session_id: uuid.UUID,
        user_message: str,
        user_profile: UserProfile,
        learning_goals: List[str]
    ) -> AsyncIterator[str]:
        pass

class AbstractMissionService(ABC):
    @abstractmethod
    async def start_mission(self, user_id: uuid.UUID, mission_id: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
        pass

    @abstractmethod
    async def complete_mission(self, attempt_id: uuid.UUID) -> UserMissionAttempt:
        pass

    @abstractmethod
    async def abandon_mission(self, attempt_id: uuid.UUID) -> UserMissionAttempt:
        pass

class AbstractMissionFeedbackService(ABC):
    @abstractmethod
    async def generate_feedback(
        self,
        scenario_prompt: str,
        transcript: List[Dict[str, Any]],
        cefr_level: str,
        ui_language: str
    ) -> MissionFeedback:
        pass
