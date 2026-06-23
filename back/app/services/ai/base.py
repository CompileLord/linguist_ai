from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, Type, TypeVar
from pydantic import BaseModel, Field

class GenerationConfig(BaseModel):
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    top_k: int = Field(default=40, ge=1)
    max_output_tokens: int = Field(default=2048, ge=1)
    response_mime_type: str = Field(default="text/plain")

T = TypeVar("T", bound=BaseModel)

class AbstractAIProvider(ABC):
    @abstractmethod
    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> str:
        pass

    @abstractmethod
    async def generate_content_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> T:
        pass
