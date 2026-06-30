from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, Type, TypeVar, Any
from pydantic import BaseModel, Field

class GenerationConfig(BaseModel):
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    top_k: int = Field(default=40, ge=1)
    max_output_tokens: int = Field(default=2048, ge=1)
    response_mime_type: str = Field(default="text/plain")
    model: Optional[str] = None
    # Set to 0 to disable thinking (required for low-latency streaming like speaking)
    thinking_budget: Optional[int] = None


T = TypeVar("T", bound=BaseModel)

class AbstractAIProvider(ABC):
    @abstractmethod
    async def generate_content(
        self,
        prompt: Any,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> str:
        pass

    @abstractmethod
    async def generate_content_stream(
        self,
        prompt: Any,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: Any,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> T:
        pass
