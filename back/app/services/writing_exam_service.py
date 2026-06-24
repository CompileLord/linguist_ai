import uuid
from typing import List, Optional
from app.models.writing_exam import WritingExam
from app.models.enums import CEFRLevel
from app.schemas.writing_exam import WritingExamPromptGenerateAI, WritingEvaluationAI
from app.repositories.writing_exam_repository import WritingExamRepository
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.core.exceptions import NotFoundException, ValidationException

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
    def __init__(self, ai_provider: AbstractAIProvider, prompt_manager: PromptManager, repository: WritingExamRepository):
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self._repository = repository

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
        return updated_exam
