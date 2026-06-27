"""
Test suite to verify audit fixes are working correctly.
Run with: pytest test_audit_fixes.py -v
"""
import pytest
import asyncio
from app.services.cache_service import InMemoryCacheService
from app.services.error_explanation_service import ErrorExplanationService
from app.services.quota_tracking_service import QuotaTrackingService
from unittest.mock import AsyncMock
from app.models.enums import CEFRLevel


class TestCacheService:
    """Test the new cache service implementation."""
    
    @pytest.mark.asyncio
    async def test_cache_set_and_get(self):
        """Test basic cache set and get operations."""
        cache = InMemoryCacheService()
        
        await cache.set("test_key", "test_value")
        result = await cache.get("test_key")
        
        assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test that cache entries expire after TTL."""
        cache = InMemoryCacheService()
        
        await cache.set("test_key", "test_value", ttl_seconds=1)
        
        # Should exist immediately
        result = await cache.get("test_key")
        assert result == "test_value"
        
        # Wait for expiration
        await asyncio.sleep(1.1)
        
        # Should be expired
        result = await cache.get("test_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_concurrent_access(self):
        """Test cache handles concurrent access correctly."""
        cache = InMemoryCacheService()
        
        async def writer(key, value):
            await cache.set(key, value)
        
        async def reader(key):
            return await cache.get(key)
        
        # Concurrent writes
        await asyncio.gather(
            writer("key1", "value1"),
            writer("key2", "value2"),
            writer("key3", "value3")
        )
        
        # Concurrent reads
        results = await asyncio.gather(
            reader("key1"),
            reader("key2"),
            reader("key3")
        )
        
        assert results == ["value1", "value2", "value3"]


class TestErrorExplanationService:
    """Test that ErrorExplanationService uses cache correctly."""
    
    @pytest.mark.asyncio
    async def test_error_explanation_uses_cache(self):
        """Test that error explanations are cached."""
        mock_ai_provider = AsyncMock()
        mock_ai_provider.generate_content = AsyncMock(return_value="Test explanation")
        
        cache = InMemoryCacheService()
        service = ErrorExplanationService(mock_ai_provider, cache)
        
        # First call should hit AI provider
        result1 = await service.generate_explanation(
            error_text="I goed",
            correct_text="I went",
            category="grammar",
            target_language="en",
            cefr_level=CEFRLevel.A1,
            ui_language="en"
        )
        
        assert result1 == "Test explanation"
        assert mock_ai_provider.generate_content.call_count == 1
        
        # Second call should use cache
        result2 = await service.generate_explanation(
            error_text="I goed",
            correct_text="I went",
            category="grammar",
            target_language="en",
            cefr_level=CEFRLevel.A1,
            ui_language="en"
        )
        
        assert result2 == "Test explanation"
        # Should still be 1 (not called again)
        assert mock_ai_provider.generate_content.call_count == 1


class TestQuotaTrackingService:
    """Test QuotaTrackingService cache usage."""
    
    @pytest.mark.asyncio
    async def test_quota_service_uses_cache_for_limits(self):
        """Test that quota limits are cached."""
        mock_quota_repo = AsyncMock()
        mock_profile_repo = AsyncMock()
        cache = InMemoryCacheService()
        
        service = QuotaTrackingService(mock_quota_repo, mock_profile_repo, cache)
        
        # First call
        limit1 = await service._get_limit("speaking_minutes")
        assert limit1 == 30  # Default value
        
        # Should be in cache now
        cached_value = await cache.get("quota_limit:speaking_minutes")
        assert cached_value == "30"
        
        # Second call should use cache
        limit2 = await service._get_limit("speaking_minutes")
        assert limit2 == 30
