import uuid
from abc import abstractmethod
from typing import Optional
from app.models.user import User
from app.repositories.interfaces.base import AbstractRepository

class AbstractUserRepository(AbstractRepository[User, uuid.UUID]):
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def exists_by_email(self, email: str) -> bool:
        pass

    @abstractmethod
    async def update_last_login(self, user_id: uuid.UUID) -> None:
        pass
