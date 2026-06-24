import uuid
from abc import abstractmethod
from typing import List, Optional
from app.models.tutor_session import TutorSession
from app.models.tutor_message import TutorMessage
from app.repositories.interfaces.base import AbstractRepository

class AbstractTutorSessionRepository(AbstractRepository[TutorSession, uuid.UUID]):
    @abstractmethod
    async def get_active_session(self, user_id: uuid.UUID) -> Optional[TutorSession]:
        pass

    @abstractmethod
    async def list_by_user(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        include_ended: bool = False
    ) -> List[TutorSession]:
        pass

    @abstractmethod
    async def end_session(self, session_id: uuid.UUID) -> Optional[TutorSession]:
        pass

    @abstractmethod
    async def increment_message_count(self, session_id: uuid.UUID) -> None:
        pass

class AbstractTutorMessageRepository(AbstractRepository[TutorMessage, uuid.UUID]):
    @abstractmethod
    async def list_by_session(
        self,
        session_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
        order: str = "asc"
    ) -> List[TutorMessage]:
        pass

    @abstractmethod
    async def get_last_n_messages(self, session_id: uuid.UUID, n: int) -> List[TutorMessage]:
        pass

    @abstractmethod
    async def count_by_session(self, session_id: uuid.UUID) -> int:
        pass
