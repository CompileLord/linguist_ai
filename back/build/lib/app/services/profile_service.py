import uuid
from typing import List
from app.models.user_profile import UserProfile
from app.models.user_goal import UserGoal
from app.models.enums import CEFRLevel
from app.schemas.profile import ProfileSetupRequest, ProfileResponse, GoalsUpdateRequest, GoalResponse
from app.services.interfaces.profile import AbstractProfileService
from app.repositories.interfaces.profile import AbstractProfileRepository
from app.repositories.interfaces.goals import AbstractGoalsRepository
from app.services.interfaces.language import AbstractLanguageService
from app.core.exceptions import NotFoundException, ConflictException

class ProfileService(AbstractProfileService):
    def __init__(
        self,
        repository: AbstractProfileRepository,
        goals_repository: AbstractGoalsRepository,
        language_service: AbstractLanguageService
    ) -> None:
        super().__init__(repository)
        self._goals_repository = goals_repository
        self._language_service = language_service

    async def setup_profile(self, user_id: uuid.UUID, schema: ProfileSetupRequest) -> ProfileResponse:
        if await self._repository.exists_for_user(user_id):
            raise ConflictException("Profile already exists for this user")

        lang = await self._language_service.validate_language_code(schema.target_language_code)

        profile = UserProfile(
            user_id=user_id,
            target_language_id=lang.id,
            native_language_code=schema.native_language_code,
            daily_goal_minutes=schema.daily_goal_minutes,
            current_level=None,
            placement_score=None,
            onboarding_completed=False
        )
        await self._repository.create(profile)

        goals = []
        for i, goal_type in enumerate(schema.goals):
            goal = UserGoal(
                user_id=user_id,
                goal_type=goal_type,
                is_primary=(i == 0),
                priority_order=i
            )
            await self._goals_repository.create(goal)
            goals.append(goal)

        return ProfileResponse(
            user_id=user_id,
            target_language_code=lang.code,
            native_language_code=profile.native_language_code,
            current_level=profile.current_level,
            placement_score=profile.placement_score,
            daily_goal_minutes=profile.daily_goal_minutes,
            streak_count=profile.streak_count,
            total_xp=profile.total_xp,
            onboarding_completed=profile.onboarding_completed,
            goals=[GoalResponse.model_validate(g) for g in goals]
        )

    async def get_profile(self, user_id: uuid.UUID) -> ProfileResponse:
        profile = await self._repository.get_by_user_id(user_id)
        if not profile:
            raise NotFoundException("Profile not found")

        goals = await self._goals_repository.get_by_user_id(user_id)
        return ProfileResponse(
            user_id=profile.user_id,
            target_language_code=profile.target_language.code,
            native_language_code=profile.native_language_code,
            current_level=profile.current_level,
            placement_score=profile.placement_score,
            daily_goal_minutes=profile.daily_goal_minutes,
            streak_count=profile.streak_count,
            total_xp=profile.total_xp,
            onboarding_completed=profile.onboarding_completed,
            goals=[GoalResponse.model_validate(g) for g in goals]
        )

    async def update_goals(self, user_id: uuid.UUID, schema: GoalsUpdateRequest) -> List[GoalResponse]:
        if not await self._repository.exists_for_user(user_id):
            raise NotFoundException("Profile not found")

        await self._goals_repository.delete_all_for_user(user_id)

        goals = []
        for i, goal_type in enumerate(schema.goals):
            goal = UserGoal(
                user_id=user_id,
                goal_type=goal_type,
                is_primary=(i == 0),
                priority_order=i
            )
            await self._goals_repository.create(goal)
            goals.append(goal)

        return [GoalResponse.model_validate(g) for g in goals]

    async def complete_placement(self, user_id: uuid.UUID, level: CEFRLevel, score: float) -> ProfileResponse:
        if not await self._repository.exists_for_user(user_id):
            raise NotFoundException("Profile not found")

        await self._repository.update_level(user_id, level, score)
        return await self.get_profile(user_id)

    async def add_xp(self, user_id: uuid.UUID, xp: int) -> ProfileResponse:
        if not await self._repository.exists_for_user(user_id):
            raise NotFoundException("Profile not found")

        await self._repository.add_xp(user_id, xp)
        return await self.get_profile(user_id)

    async def update_streak(self, user_id: uuid.UUID, increment: int) -> ProfileResponse:
        if not await self._repository.exists_for_user(user_id):
            raise NotFoundException("Profile not found")

        await self._repository.update_streak(user_id, increment)
        return await self.get_profile(user_id)
