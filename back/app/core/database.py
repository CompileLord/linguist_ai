from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

class DatabaseManager:
    def __init__(self) -> None:
        engine_args = {"pool_pre_ping": True}
        if settings.DATABASE_URL.startswith("postgresql"):
            engine_args.update({
                "pool_size": settings.DB_POOL_SIZE,
                "max_overflow": settings.DB_MAX_OVERFLOW,
                "pool_timeout": settings.DB_POOL_TIMEOUT,
                "pool_recycle": settings.DB_POOL_RECYCLE
            })
        elif settings.DATABASE_URL.startswith("sqlite"):
            engine_args["connect_args"] = {"check_same_thread": False}
        self.engine = create_async_engine(settings.DATABASE_URL, **engine_args)
        self.async_session_factory = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        session = self.async_session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def check_connection(self) -> bool:
        try:
            async with self.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception:
            return False

    def get_pool_status(self) -> Dict[str, Any]:
        pool = self.engine.pool
        return {
            "pool_size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "checkedin": pool.checkedin()
        }

    async def close(self) -> None:
        await self.engine.dispose()

db_manager = DatabaseManager()

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.get_session() as session:
        yield session
