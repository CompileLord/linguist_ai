import json
from typing import List, Dict, Any
from app.schemas.mission import MissionFeedback
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.services.interfaces.tutor import AbstractMissionFeedbackService

class MissionFeedbackService(AbstractMissionFeedbackService):
    def __init__(self, ai_provider: AbstractAIProvider, prompt_manager: PromptManager) -> None:
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager

    async def generate_feedback(
        self,
        scenario_prompt: str,
        transcript: List[Dict[str, Any]],
        cefr_level: str,
        ui_language: str
    ) -> MissionFeedback:
        transcript_str = ""
        for msg in transcript:
            role_label = "User" if msg.get("role") == "user" else "Tutor"
            content = msg.get("content", "")
            transcript_str += f"{role_label}: {content}\n"

        prompt = self._prompt_manager.render(
            "missions/feedback",
            scenario_prompt=scenario_prompt,
            cefr_level=cefr_level,
            ui_language=ui_language,
            transcript=transcript_str
        )

        feedback = await self._ai_provider.generate_structured(
            prompt=prompt,
            response_schema=MissionFeedback
        )

        overall_score = (
            feedback.task_completion_score * 0.40 +
            feedback.accuracy_score * 0.25 +
            feedback.vocabulary_score * 0.20 +
            feedback.fluency_score * 0.15
        )
        feedback.score = round(overall_score, 1)
        return feedback
