import uuid
from typing import List, Dict, Any
from app.repositories.interfaces.tutor import AbstractTutorSessionRepository, AbstractTutorMessageRepository
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.repositories.interfaces.goals import AbstractGoalsRepository
from app.services.interfaces.tutor import AbstractTutorPromptBuilder, AbstractSessionContextManager
from app.core.exceptions import SessionNotFoundError

class SessionContextManager(AbstractSessionContextManager):
    def __init__(
        self,
        session_repo: AbstractTutorSessionRepository,
        message_repo: AbstractTutorMessageRepository,
        prompt_builder: AbstractTutorPromptBuilder,
        profile_repo: AbstractProfileRepository,
        goals_repo: AbstractGoalsRepository
    ) -> None:
        self._session_repo = session_repo
        self._message_repo = message_repo
        self._prompt_builder = prompt_builder
        self._profile_repo = profile_repo
        self._goals_repo = goals_repo
        self.max_context_tokens = 8000

    async def build_context(self, session_id: uuid.UUID, max_messages: int = 20) -> List[Dict[str, Any]]:
        session = await self._session_repo.get_by_id(session_id)
        if not session:
            raise SessionNotFoundError()

        profile = await self._profile_repo.get_by_user_id(session.user_id)
        goals_list = await self._goals_repo.get_by_user_id(session.user_id)
        goal_types = [g.goal_type for g in goals_list]

        active_lesson_topic = None
        if session.topic_context:
            active_lesson_topic = session.topic_context.get("topic")

        system_prompt = self._prompt_builder.build(
            user_profile=profile,
            learning_goals=goal_types,
            active_lesson_topic=active_lesson_topic,
            session_title=session.title
        )

        sys_msg_text = f"SYSTEM INSTRUCTION: {system_prompt}"
        ack_text = "Understood. I will stay in character inside the scenario, speak as Elena or as the character in the scene, and only step out briefly to give corrections or coaching notes."
        
        sys_tokens = len(sys_msg_text) // 4
        ack_tokens = len(ack_text) // 4
        
        messages = await self._message_repo.get_last_n_messages(session_id, max_messages)
        
        total_tokens = sys_tokens + ack_tokens
        kept_messages = []
        dropped_any = False
        
        for msg in reversed(messages):
            msg_tokens = len(msg.content) // 4
            if total_tokens + msg_tokens <= self.max_context_tokens:
                total_tokens += msg_tokens
                kept_messages.insert(0, msg)
            else:
                dropped_any = True
                break
                
        contents = []
        contents.append({"role": "user", "parts": [{"text": sys_msg_text}]})
        contents.append({"role": "model", "parts": [{"text": ack_text}]})
        
        for i, msg in enumerate(kept_messages):
            role = "user" if msg.role == "user" else "model"
            content_text = msg.content
            if i == 0 and dropped_any:
                content_text = f"[System Note: Previous messages in this conversation were omitted to fit context limits.]\n{content_text}"
            contents.append({"role": role, "parts": [{"text": content_text}]})
            
        return contents
