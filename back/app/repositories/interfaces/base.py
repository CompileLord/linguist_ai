from abc import ABC, abstractmethod
from typing import Generic, List, TypeVar, Optional
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")
PKType = TypeVar("PKType")

class AbstractRepository(ABC, Generic[ModelType, PKType]):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @abstractmethod
    async def get_by_id(self, id: PKType) -> Optional[ModelType]:
        pass

    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        pass

    @abstractmethod
    async def create(self, model: ModelType) -> ModelType:
        pass

    @abstractmethod
    async def update(self, model: ModelType) -> ModelType:
        pass

    @abstractmethod
    async def delete(self, id: PKType) -> bool:
        pass

    async def save_changes(self) -> None:
        """Safely commits changes tracked by the current session."""
        try:
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise
