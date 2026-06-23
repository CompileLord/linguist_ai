import uuid
from typing import List, Optional
from sqlalchemy import select, exists
from app.models.language import Language
from app.repositories.interfaces.language import AbstractLanguageRepository

class LanguageRepository(AbstractLanguageRepository):
    async def get_by_id(self, id: uuid.UUID) -> Optional[Language]:
        result = await self._session.execute(select(Language).filter(Language.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Language]:
        result = await self._session.execute(select(Language).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, model: Language) -> Language:
        self._session.add(model)
        await self._session.flush()
        return model

    async def update(self, model: Language) -> Language:
        self._session.add(model)
        await self._session.flush()
        return model

    async def delete(self, id: uuid.UUID) -> bool:
        model = await self.get_by_id(id)
        if model:
            await self._session.delete(model)
            await self._session.flush()
            return True
        return False

    async def get_by_code(self, code: str) -> Optional[Language]:
        result = await self._session.execute(select(Language).filter(Language.code == code))
        return result.scalar_one_or_none()

    async def get_active_languages(self) -> List[Language]:
        result = await self._session.execute(
            select(Language).filter(Language.is_active == True).order_by(Language.name)
        )
        return list(result.scalars().all())

    async def exists_by_code(self, code: str) -> bool:
        stmt = select(exists().where(Language.code == code))
        result = await self._session.execute(stmt)
        return bool(result.scalar())
