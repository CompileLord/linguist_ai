from typing import Optional
from google.cloud import texttospeech
from google.api_core.exceptions import GoogleAPIError
from app.core.exceptions import ExternalServiceException
from app.services.media.storage_service import StorageService, get_storage_service

class TextToSpeechService:
    def __init__(self, storage_service: StorageService) -> None:
        self._storage_service = storage_service
        try:
            self.client = texttospeech.TextToSpeechClient()
        except Exception:
            self.client = None

    def _get_client(self) -> texttospeech.TextToSpeechClient:
        if not self.client:
            raise ExternalServiceException(
                detail="Text-to-Speech client is not initialized",
                error_code="TTS_CLIENT_NOT_INITIALIZED"
            )
        return self.client

    async def synthesize(
        self,
        text: str,
        language_code: str,
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> bytes:
        client = self._get_client()
        
        if text.strip().startswith("<speak>"):
            synthesis_input = texttospeech.SynthesisInput(ssml=text)
        else:
            synthesis_input = texttospeech.SynthesisInput(text=text)

        if not voice_name:
            voice_name = f"{language_code}-Wavenet-A"

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=speaking_rate
        )

        try:
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            return response.audio_content
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"TTS synthesis failed: {str(e)}",
                error_code="TTS_SYNTHESIS_ERROR"
            )

    async def synthesize_and_store(
        self,
        text: str,
        language_code: str,
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> str:
        audio_bytes = await self.synthesize(text, language_code, voice_name, speaking_rate)
        destination_path = self._storage_service.generate_hash_path(audio_bytes, "mp3")
        
        exists = await self._storage_service.exists(destination_path)
        if not exists:
            await self._storage_service.upload(
                data=audio_bytes,
                destination_path=destination_path,
                content_type="audio/mpeg"
            )
            
        return await self._storage_service.get_signed_url(destination_path)
