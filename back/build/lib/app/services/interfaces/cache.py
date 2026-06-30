"""
Abstract cache service interface for distributed caching.
"""
from abc import ABC, abstractmethod
from typing import Optional


class AbstractCacheService(ABC):
    """Abstract base class for cache services."""

    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        """
        Retrieve a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        pass

    @abstractmethod
    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        """
        Store a value in the cache with optional TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time-to-live in seconds (None for no expiration)
            
        Returns:
            True if successful
        """
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """
        Delete a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if successful
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in the cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if key exists
        """
        pass

    @abstractmethod
    async def clear(self) -> bool:
        """
        Clear all keys from the cache.
        
        Returns:
            True if successful
        """
        pass
