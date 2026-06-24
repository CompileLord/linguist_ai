import uuid
from typing import List, Optional
from app.models.user_profile import UserProfile
from app.services.ai.prompts import PromptManager
from app.services.interfaces.tutor import AbstractTutorPromptBuilder

class TutorPromptBuilder(AbstractTutorPromptBuilder):
    def __init__(self, prompt_manager: PromptManager) -> None:
        self._prompt_manager = prompt_manager

    def build(
        self,
        user_profile: UserProfile,
        learning_goals: List[str],
        active_lesson_topic: Optional[str] = None,
        session_title: Optional[str] = None
    ) -> str:
        lang_name_map = {"en": "English", "ru": "Russian", "tg": "Tajik"}
        ui_lang = lang_name_map.get(user_profile.native_language_code, "Russian")
        
        level_str = user_profile.current_level.value if user_profile.current_level else "A1"
        goals_str = ", ".join(learning_goals) if learning_goals else "General English"
        
        context_parts = []
        if active_lesson_topic:
            context_parts.append(f"Lesson topic: {active_lesson_topic}")
        if session_title:
            context_parts.append(f"Session topic: {session_title}")
        context_str = " | ".join(context_parts) if context_parts else "General Conversation"

        prompt = self._prompt_manager.render(
            "tutor/system_prompt",
            cefr_level=level_str,
            ui_language=ui_lang,
            learning_goals=goals_str,
            session_context=context_str
        )

        estimated_tokens = len(prompt) // 4
        if estimated_tokens > 2000:
            prompt = prompt[:8000]
            
        return prompt
