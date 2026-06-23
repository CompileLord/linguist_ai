from typing import Dict, Type
from app.services.ai.base import AbstractAIProvider
from app.services.ai.vertex_provider import VertexAIProvider
from app.core.exceptions import ValidationException

class AIProviderFactory:
    def __init__(self) -> None:
        self._registry: Dict[str, Type[AbstractAIProvider]] = {
            "vertex": VertexAIProvider
        }
        self._cache: Dict[str, AbstractAIProvider] = {}

    def create(self, provider_name: str) -> AbstractAIProvider:
        name = provider_name.lower()
        if name not in self._registry:
            valid_providers = ", ".join(self._registry.keys())
            raise ValidationException(
                detail=f"Unknown AI provider '{provider_name}'. Available options: {valid_providers}",
                error_code="UNKNOWN_AI_PROVIDER"
            )
        
        if name not in self._cache:
            provider_class = self._registry[name]
            self._cache[name] = provider_class()
            
        return self._cache[name]

_factory = AIProviderFactory()

def get_ai_provider() -> AbstractAIProvider:
    return _factory.create("vertex")
