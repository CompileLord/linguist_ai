from typing import AsyncIterator, Optional, Type
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel
from app.core.config import settings
from app.core.exceptions import ExternalServiceException
from app.services.ai.base import AbstractAIProvider, GenerationConfig, T

class VertexAIProvider(AbstractAIProvider):
    def __init__(self) -> None:
        self.client = genai.Client(
            vertexai=True,
            project=settings.VERTEX_AI_PROJECT,
            location=settings.VERTEX_AI_LOCATION
        )
        self.model = settings.VERTEX_AI_MODEL

    def _build_sdk_config(
        self,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None,
        response_schema: Optional[Type[BaseModel]] = None
    ) -> types.GenerateContentConfig:
        sdk_config = types.GenerateContentConfig()
        
        if system_instruction:
            sdk_config.system_instruction = system_instruction
            
        if config:
            sdk_config.temperature = config.temperature
            sdk_config.top_p = config.top_p
            sdk_config.top_k = config.top_k
            sdk_config.max_output_tokens = config.max_output_tokens
            sdk_config.response_mime_type = config.response_mime_type
            
        if response_schema:
            sdk_config.response_mime_type = "application/json"
            sdk_config.response_schema = response_schema
            
        return sdk_config

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> str:
        try:
            sdk_config = self._build_sdk_config(system_instruction, config)
            model_name = config.model if (config and config.model) else self.model
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=sdk_config
            )
            return response.text or ""
        except APIError as e:
            raise ExternalServiceException(detail=f"Vertex AI error: {str(e)}", error_code="AI_API_ERROR")
        except Exception as e:
            raise ExternalServiceException(detail=f"Unexpected AI error: {str(e)}", error_code="AI_UNEXPECTED_ERROR")

    async def generate_content_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        try:
            sdk_config = self._build_sdk_config(system_instruction, config)
            model_name = config.model if (config and config.model) else self.model
            response = self.client.models.generate_content_stream(
                model=model_name,
                contents=prompt,
                config=sdk_config
            )
            for chunk in response:
                yield chunk.text or ""
        except APIError as e:
            raise ExternalServiceException(detail=f"Vertex AI streaming error: {str(e)}", error_code="AI_API_ERROR")
        except Exception as e:
            raise ExternalServiceException(detail=f"Unexpected streaming error: {str(e)}", error_code="AI_UNEXPECTED_ERROR")

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> T:
        try:
            sdk_config = self._build_sdk_config(system_instruction, config, response_schema)
            model_name = config.model if (config and config.model) else self.model
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=sdk_config
            )
            raw_text = response.text or "{}"
            return response_schema.parse_raw(raw_text)
        except APIError as e:
            raise ExternalServiceException(detail=f"Vertex AI structured output error: {str(e)}", error_code="AI_API_ERROR")
        except Exception as e:
            raise ExternalServiceException(detail=f"Unexpected structured error: {str(e)}", error_code="AI_UNEXPECTED_ERROR")

