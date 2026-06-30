import uuid
from typing import List
from app.models.achievement import Achievement
from app.repositories.interfaces.achievement import AbstractAchievementRepository
from app.services.achievement_evaluation_engine import AchievementEvaluationEngine

class AchievementService:
    def __init__(
        self,
        achievement_repo: AbstractAchievementRepository,
        evaluation_engine: AchievementEvaluationEngine
    ) -> None:
        self.achievement_repo = achievement_repo
        self.evaluation_engine = evaluation_engine

    async def evaluate_and_award(
        self,
        user_id: uuid.UUID,
        event_type: str,
        context: dict = None
    ) -> List[Achievement]:
        qualifying = await self.evaluation_engine.evaluate_achievements(
            user_id=user_id,
            event_type=event_type,
            context=context
        )
        
        awarded = []
        for ach in qualifying:
            already_has = await self.achievement_repo.has_achievement(user_id, ach.code)
            if not already_has:
                await self.achievement_repo.award(user_id, ach.id)
                awarded.append(ach)
                
        return awarded
