import uuid
from typing import Dict, List, Optional
from app.models.enums import CEFRLevel
from app.schemas.placement import PlacementQuestion, PlacementStepResult, PlacementResult
from app.services.interfaces.profile import AbstractProfileService
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.core.exceptions import NotFoundException

LANGUAGE_NAME_MAP = {
    "en": "English",
    "ru": "Russian",
    "tg": "Tajik"
}

class PlacementTestService:
    _sessions: Dict[uuid.UUID, dict] = {}
    _results: Dict[uuid.UUID, PlacementResult] = {}

    def __init__(
        self,
        ai_provider: AbstractAIProvider,
        prompt_manager: PromptManager,
        profile_service: AbstractProfileService
    ) -> None:
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self._profile_service = profile_service

    async def generate_question_content(
        self,
        level: CEFRLevel,
        target_lang: str,
        ui_lang: str
    ) -> PlacementQuestion:
        prompt = self._prompt_manager.render(
            "onboarding/placement_question",
            target_language=target_lang,
            difficulty_level=level.value,
            ui_language=ui_lang
        )
        question = await self._ai_provider.generate_structured(
            prompt=prompt,
            response_schema=PlacementQuestion
        )
        return question

    async def start_placement(self, user_id: uuid.UUID) -> PlacementQuestion:
        profile = await self._profile_service.get_profile(user_id)
        target_lang = LANGUAGE_NAME_MAP.get(profile.target_language_code, "English")
        ui_lang = LANGUAGE_NAME_MAP.get(profile.native_language_code, "Russian")

        initial_level = CEFRLevel.B1
        first_question = await self.generate_question_content(initial_level, target_lang, ui_lang)

        self._sessions[user_id] = {
            "current_question_index": 0,
            "difficulty_history": [initial_level],
            "questions": [first_question],
            "answers": [],
            "low": 0,
            "high": 5,
            "current_level": initial_level,
            "target_language_name": target_lang,
            "ui_language_name": ui_lang
        }
        return first_question

    async def process_answer(self, user_id: uuid.UUID, answer_index: int) -> PlacementStepResult:
        session = self._sessions.get(user_id)
        if not session:
            raise NotFoundException("Placement session not found. Please start a new placement test.")

        current_question = session["questions"][-1]
        is_correct = (answer_index == current_question.correct_answer_index)
        session["answers"].append(answer_index)

        current_level = session["current_level"]
        current_idx = list(CEFRLevel).index(current_level)

        if is_correct:
            session["low"] = max(session["low"], current_idx + 1)
        else:
            session["high"] = min(session["high"], current_idx - 1)

        if session["low"] > session["high"]:
            session["low"] = session["high"] = current_idx

        next_idx = (session["low"] + session["high"]) // 2
        next_level = list(CEFRLevel)[next_idx]

        session["current_question_index"] += 1

        is_stable = (next_level == current_level)
        max_reached = (session["current_question_index"] >= 10)

        explanation = current_question.explanation

        if is_stable or max_reached:
            await self.finalize_placement(user_id)
            return PlacementStepResult(
                is_correct=is_correct,
                explanation=explanation,
                next_question=None,
                current_estimate=next_level
            )
        else:
            next_question = await self.generate_question_content(
                next_level,
                session["target_language_name"],
                session["ui_language_name"]
            )
            session["questions"].append(next_question)
            session["difficulty_history"].append(next_level)
            session["current_level"] = next_level

            return PlacementStepResult(
                is_correct=is_correct,
                explanation=explanation,
                next_question=next_question,
                current_estimate=next_level
            )

    async def finalize_placement(self, user_id: uuid.UUID) -> PlacementResult:
        session = self._sessions.get(user_id)
        if not session:
            if user_id in self._results:
                return self._results[user_id]
            raise NotFoundException("No active or completed placement test found for this user.")

        levels = session["difficulty_history"]
        questions = session["questions"]
        answers = session["answers"]

        correct_count = 0
        for q, ans in zip(questions, answers):
            if ans == q.correct_answer_index:
                correct_count += 1

        questions_answered = len(answers)
        accuracy = (correct_count / questions_answered) if questions_answered > 0 else 0.0

        total_weighted = 0.0
        total_weight = 0.0
        for i, lvl in enumerate(levels[:questions_answered]):
            lvl_idx = list(CEFRLevel).index(lvl)
            lvl_score = lvl_idx / 5.0
            weight = i + 1
            total_weighted += lvl_score * weight
            total_weight += weight

        final_score = (total_weighted / total_weight) if total_weight > 0 else 0.5
        final_level = CEFRLevel.from_score(final_score)

        starting_topics_map = {
            CEFRLevel.A1: ["Greetings & Introductions", "Basic Vocabulary", "Present Simple tense"],
            CEFRLevel.A2: ["Past Simple tense", "Making Plans", "Comparative Adjectives"],
            CEFRLevel.B1: ["Present Perfect tense", "Modal Verbs", "Giving Advice"],
            CEFRLevel.B2: ["Passive Voice", "Conditionals Type 1 & 2", "Reported Speech"],
            CEFRLevel.C1: ["Subjunctive Mood", "Inversion in English", "Advanced Idioms"],
            CEFRLevel.C2: ["Nuanced Communication", "Metaphors and Rhetoric", "Complex Syntax"]
        }
        recommended_topics = starting_topics_map.get(final_level, starting_topics_map[CEFRLevel.B1])

        await self._profile_service.complete_placement(user_id, final_level, final_score)

        result = PlacementResult(
            final_level=final_level,
            score=final_score,
            questions_answered=questions_answered,
            correct_count=correct_count,
            accuracy=accuracy,
            level_description=final_level.description,
            recommended_starting_topics=recommended_topics
        )

        self._results[user_id] = result
        self._sessions.pop(user_id, None)

        return result
