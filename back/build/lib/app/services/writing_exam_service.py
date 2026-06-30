import uuid
from typing import List, Optional
from app.models.writing_exam import WritingExam
from app.models.enums import CEFRLevel
from app.schemas.writing_exam import WritingExamPromptGenerateAI, WritingEvaluationAI
from app.repositories.writing_exam_repository import WritingExamRepository
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.core.exceptions import NotFoundException, ValidationException
from app.services.xp_calculation_service import ActionType, XPCalculationService
from app.services.streak_tracking_service import StreakTrackingService
from app.services.game_level_progression_service import GameLevelProgressionService
from app.services.achievement_service import AchievementService
from app.repositories.gamification_repository import GamificationRepository

class WritingPromptGenerationService:
    def __init__(self, ai_provider: AbstractAIProvider, prompt_manager: PromptManager):
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager

    async def generate_prompt(self, target_language: str, level: CEFRLevel, learning_goals: List[str]) -> WritingExamPromptGenerateAI:
        goal = learning_goals[0] if learning_goals else "general"
        prompt = self._prompt_manager.render(
            "exams/writing_prompt",
            target_language=target_language,
            level=level.value,
            learning_goal=goal
        )
        return await self._ai_provider.generate_structured(
            prompt=prompt,
            response_schema=WritingExamPromptGenerateAI
        )

class WritingEvaluationService:
    def __init__(
        self,
        ai_provider: AbstractAIProvider,
        prompt_manager: PromptManager,
        repository: WritingExamRepository,
        xp_calc_service: Optional[XPCalculationService] = None,
        streak_service: Optional[StreakTrackingService] = None,
        level_progression_service: Optional[GameLevelProgressionService] = None,
        achievement_service: Optional[AchievementService] = None,
        gamification_repo: Optional[GamificationRepository] = None
    ):
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self._repository = repository
        self._xp_calc_service = xp_calc_service
        self._streak_service = streak_service
        self._level_progression_service = level_progression_service
        self._achievement_service = achievement_service
        self._gamification_repo = gamification_repo

    async def evaluate_submission(self, exam_id: uuid.UUID, submitted_text: str) -> WritingExam:
        exam = await self._repository.get_by_id(exam_id)
        if not exam:
            raise NotFoundException(detail="Writing exam not found")

        prompt = self._prompt_manager.render(
            "exams/writing_evaluation",
            original_prompt=exam.prompt,
            submitted_text=submitted_text
        )

        evaluation = None
        for attempt in range(2):
            try:
                evaluation = await self._ai_provider.generate_structured(
                    prompt=prompt,
                    response_schema=WritingEvaluationAI
                )
                break
            except Exception as e:
                if attempt == 1:
                    raise ValidationException(
                        detail=f"Writing evaluation failed validation: {str(e)}. Please retry submitting.",
                        error_code="WRITING_EVALUATION_FAILED"
                    )

        computed_score = (
            evaluation.grammar_score * 0.25 +
            evaluation.vocabulary_score * 0.20 +
            evaluation.cohesion_score * 0.20 +
            evaluation.naturalness_score * 0.20 +
            evaluation.style_score * 0.15
        )
        overall_score = round(computed_score, 1)

        scores_dict = {
            "grammar": evaluation.grammar_score,
            "vocabulary": evaluation.vocabulary_score,
            "cohesion": evaluation.cohesion_score,
            "naturalness": evaluation.naturalness_score,
            "style": evaluation.style_score
        }

        feedback_list = []
        for item in evaluation.feedback_items:
            feedback_list.append(
                f"- [{item.criterion.upper()}] Issue: {item.issue}\n"
                f"  Recommendation: {item.recommendation}\n"
                f"  Corrected Example: \"{item.corrected_example}\""
            )
        feedback_text = "\n".join(feedback_list)

        updated_exam = await self._repository.update_submission(
            exam_id=exam_id,
            submitted_text=submitted_text,
            scores=scores_dict,
            overall_score=overall_score,
            feedback_text=feedback_text
        )

        if overall_score >= 50:
            if self._xp_calc_service and self._gamification_repo:
                xp_earned = self._xp_calc_service.calculate_xp(ActionType.WRITING_EXAM_PASS, score=overall_score)
                await self._gamification_repo.add_xp(exam.user_id, xp_earned)
            if self._streak_service:
                await self._streak_service.record_activity(exam.user_id)
            if self._level_progression_service:
                await self._level_progression_service.check_and_apply_level_up(exam.user_id)
            if self._achievement_service:
                await self._achievement_service.evaluate_and_award(
                    exam.user_id,
                    "exam_completion",
                    {"exam_type": "writing", "score": overall_score}
                )

        return updated_exam
