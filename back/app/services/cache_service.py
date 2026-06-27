"""
In-memory cache service implementation (for development/single-worker).
Production should use Redis or another distributed cache.
"""
import asyncio
import time
from typing import Optional, Dict, Tuple
from app.services.interfaces.cache import AbstractCacheService


class InMemoryCacheService(AbstractCacheService):
    """
    Thread-safe in-memory cache implementation.
    
    WARNING: This implementation is only suitable for single-worker development.
    For production with multiple workers/instances, use RedisCacheService.
    """

    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[str, Optional[float]]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        """Retrieve a value from the cache."""
        async with self._lock:
            if key not in self._cache:
                return None
            
            value, expires_at = self._cache[key]
            
            # Check if expired
            if expires_at is not None and time.time() > expires_at:
                del self._cache[key]
                return None
            
            return value

    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        """Store a value in the cache with optional TTL."""
        async with self._lock:
            expires_at = None
            if ttl_seconds is not None:
                expires_at = time.time() + ttl_seconds
            
            self._cache[key] = (value, expires_at)
            return True

    async def delete(self, key: str) -> bool:
        """Delete a value from the cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in the cache."""
        value = await self.get(key)
        return value is not None

    async def clear(self) -> bool:
        """Clear all keys from the cache."""
        async with self._lock:
            self._cache.clear()
            return True

    async def cleanup_expired(self) -> int:
        """Remove expired entries. Returns count of removed entries."""
        async with self._lock:
            now = time.time()
            expired_keys = [
                key for key, (_, expires_at) in self._cache.items()
                if expires_at is not None and now > expires_at
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            return len(expired_keys)


# Global singleton instance
_cache_service_instance: Optional[AbstractCacheService] = None


def get_cache_service() -> AbstractCacheService:
    """Get the global cache service instance."""
    global _cache_service_instance
    if _cache_service_instance is None:
        # In production, this should check configuration and potentially
        # return RedisCacheService instead
        _cache_service_instance = InMemoryCacheService()
    return _cache_service_instance
