import uuid
import logging
from typing import AsyncIterator, List
from app.models.tutor_message import TutorMessage
from app.models.user_profile import UserProfile
from app.repositories.interfaces.tutor import AbstractTutorSessionRepository, AbstractTutorMessageRepository
from app.services.interfaces.tutor import AbstractTutorService, AbstractSessionContextManager, AbstractTutorRateLimiter
from app.services.ai.base import AbstractAIProvider, GenerationConfig
from app.core.exceptions import RateLimitException, SessionNotFoundError

logger = logging.getLogger("tutor")

class TutorService(AbstractTutorService):
    def __init__(
        self,
        session_repo: AbstractTutorSessionRepository,
        message_repo: AbstractTutorMessageRepository,
        context_manager: AbstractSessionContextManager,
        rate_limiter: AbstractTutorRateLimiter,
        ai_provider: AbstractAIProvider
    ) -> None:
        self._session_repo = session_repo
        self._message_repo = message_repo
        self._context_manager = context_manager
        self._rate_limiter = rate_limiter
        self._ai_provider = ai_provider

    async def process_message(
        self,
        session_id: uuid.UUID,
        user_message: str,
        user_profile: UserProfile,
        learning_goals: List[str]
    ) -> AsyncIterator[str]:
        session = await self._session_repo.get_by_id(session_id)
        if not session:
            raise SessionNotFoundError()

        rate_status = await self._rate_limiter.check_limit(session.user_id)
        if not rate_status.allowed:
            raise RateLimitException(
                detail=f"Rate limit exceeded. Remaining messages: 0. Resets at {rate_status.reset_at.isoformat()}",
                error_code="TUTOR_RATE_LIMIT_EXCEEDED",
                details={
                    "remaining": 0,
                    "reset_at": rate_status.reset_at.isoformat()
                }
            )

        user_msg = TutorMessage(
            session_id=session_id,
            role="user",
            content=user_message
        )
        await self._message_repo.create(user_msg)
        await self._session_repo.increment_message_count(session_id)
        await self._rate_limiter.increment(session.user_id)

        contents = await self._context_manager.build_context(session_id)

        accumulated_text = ""
        error_occurred = False

        _config = GenerationConfig(
            temperature=0.8,
            max_output_tokens=1024,
            thinking_budget=0,  # disable thinking for low-latency chat
        )
        try:
            async for chunk in self._ai_provider.generate_content_stream(contents, config=_config):
                accumulated_text += chunk
                yield chunk
        except Exception as e:
            error_occurred = True
            yield f"\n[Error: Connection lost or generation failed. Details: {str(e)}]"
            logger.exception("Error during tutor streaming")

        assistant_msg = TutorMessage(
            session_id=session_id,
            role="assistant",
            content=accumulated_text or "Error: Generation failed.",
            metadata_json={"error": True} if error_occurred else None
        )
        await self._message_repo.create(assistant_msg)
        await self._session_repo.increment_message_count(session_id)
