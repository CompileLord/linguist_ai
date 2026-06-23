import uuid
from abc import abstractmethod
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, AuthResponse
from app.services.interfaces.base import AbstractService
from app.repositories.interfaces.user import AbstractUserRepository

class AbstractAuthService(AbstractService[AbstractUserRepository]):
    @abstractmethod
    async def register(self, schema: RegisterRequest) -> AuthResponse:
        pass

    @abstractmethod
    async def login(self, schema: LoginRequest) -> AuthResponse:
        pass

    @abstractmethod
    async def refresh(self, refresh_token: str) -> AuthResponse:
        pass

    @abstractmethod
    async def get_user_by_token(self, token: str) -> User:
        pass
