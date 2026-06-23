import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, exists
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.interfaces.user import AbstractUserRepository

class UserRepository(AbstractUserRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[User]:
        result = await self._session.execute(select(User).filter(User.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        result = await self._session.execute(select(User).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: User) -> User:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: User) -> User:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        user = await self.get_by_id(id)
        if user:
            await self._session.delete(user)
            await self._session.flush()
            return True
        return False

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self._session.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    async def exists_by_email(self, email: str) -> bool:
        stmt = select(exists().where(User.email == email))
        result = await self._session.execute(stmt)
        return bool(result.scalar())

    async def update_last_login(self, user_id: uuid.UUID) -> None:
        user = await self.get_by_id(user_id)
        if user:
            user.last_login_at = datetime.utcnow()
            self._session.add(user)
            await self._session.flush()
