import uuid
from abc import abstractmethod
from typing import Optional, List, Dict, Any
from app.models.user_error import UserError
from app.models.enums import ErrorCategory
from app.repositories.interfaces.base import AbstractRepository

class AbstractUserErrorRepository(AbstractRepository[UserError, uuid.UUID]):
    @abstractmethod
    async def find_matching_error(
        self,
        user_id: uuid.UUID,
        category: ErrorCategory,
        error_text: str
    ) -> Optional[UserError]:
        pass

    @abstractmethod
    async def list_by_user(
        self,
        user_id: uuid.UUID,
        category: Optional[ErrorCategory] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = "recent"
    ) -> List[UserError]:
        pass

    @abstractmethod
    async def list_frequent(
        self,
        user_id: uuid.UUID,
        min_occurrence_count: int = 3,
        limit: int = 10
    ) -> List[UserError]:
        pass

    @abstractmethod
    async def get_error_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:
        pass
