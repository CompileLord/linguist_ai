import uuid
from abc import abstractmethod
from typing import List
from app.models.enums import CEFRLevel
from app.schemas.profile import ProfileSetupRequest, ProfileResponse, GoalsUpdateRequest, GoalResponse
from app.services.interfaces.base import AbstractService
from app.repositories.interfaces.profile import AbstractProfileRepository

class AbstractProfileService(AbstractService[AbstractProfileRepository]):
    @abstractmethod
    async def setup_profile(self, user_id: uuid.UUID, schema: ProfileSetupRequest) -> ProfileResponse:
        pass

    @abstractmethod
    async def get_profile(self, user_id: uuid.UUID) -> ProfileResponse:
        pass

    @abstractmethod
    async def update_goals(self, user_id: uuid.UUID, schema: GoalsUpdateRequest) -> List[GoalResponse]:
        pass

    @abstractmethod
    async def complete_placement(self, user_id: uuid.UUID, level: CEFRLevel, score: float) -> ProfileResponse:
        pass
