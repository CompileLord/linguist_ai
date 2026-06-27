import asyncio
import os
import tempfile
import urllib.request
from pathlib import Path
from typing import Optional
from app.core.exceptions import ExternalServiceException
from app.services.media.storage_service import StorageService
from app.core.logging import LoggerFactory

logger = LoggerFactory.get_logger("TTSService")

VOICE_MAP = {
    "hfc_female": {
        "dir_name": "hfc_female",
        "onnx_name": "en_US-hfc_female-medium.onnx",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx.json"
    },
    "hfc_male": {
        "dir_name": "hfc_male",
        "onnx_name": "en_US-hfc_male-medium.onnx",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_male/medium/en_US-hfc_male-medium.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_male/medium/en_US-hfc_male-medium.onnx.json"
    }
}

_voice_cache = {}

class TextToSpeechService:
    def __init__(self, storage_service: StorageService) -> None:
        self._storage_service = storage_service

    async def _ensure_voice_files(self, voice_key: str) -> Path:
        if voice_key not in VOICE_MAP:
            raise ValueError(f"Unknown voice model: {voice_key}")
        
        voice_info = VOICE_MAP[voice_key]
        voices_dir = Path(__file__).resolve().parent.parent.parent.parent / "voices"
        voice_dir = voices_dir / voice_info["dir_name"]
        voice_dir.mkdir(parents=True, exist_ok=True)
        
        onnx_path = voice_dir / voice_info["onnx_name"]
        json_path = voice_dir / (voice_info["onnx_name"] + ".json")
        
        if not onnx_path.exists():
            logger.info(f"Downloading voice model {voice_key} from {voice_info['onnx_url']}...")
            try:
                urllib.request.urlretrieve(voice_info["onnx_url"], str(onnx_path))
                logger.info(f"Successfully downloaded {voice_info['onnx_name']}")
            except Exception as e:
                logger.error(f"Failed to download voice model {voice_key}: {e}")
                if onnx_path.exists():
                    onnx_path.unlink()
                raise e
                
        if not json_path.exists():
            logger.info(f"Downloading config for {voice_key} from {voice_info['json_url']}...")
            try:
                urllib.request.urlretrieve(voice_info["json_url"], str(json_path))
                logger.info(f"Successfully downloaded config {voice_info['onnx_name']}.json")
            except Exception as e:
                logger.error(f"Failed to download config for {voice_key}: {e}")
                if json_path.exists():
                    json_path.unlink()
                raise e
                
        return onnx_path

    async def synthesize(
        self,
        text: str,
        language_code: str,
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> bytes:
        """
        Synthesize speech from text.
        
        FIXED: Offloads blocking I/O operations to thread pool to avoid
        blocking the async event loop.
        """
        clean_text = text.strip()
        if clean_text.startswith("<speak>") and clean_text.endswith("</speak>"):
            clean_text = clean_text[7:-8].strip()

        resolved_voice = voice_name or "hfc_female"
        if resolved_voice not in VOICE_MAP:
            resolved_voice = "hfc_female"

        try:
            model_path = await self._ensure_voice_files(resolved_voice)
            model_path_str = str(model_path)
            
            import piper
            if model_path_str not in _voice_cache:
                _voice_cache[model_path_str] = piper.PiperVoice.load(model_path_str)
            
            voice = _voice_cache[model_path_str]
            
            # Offload blocking synthesis to thread pool
            audio_bytes = await asyncio.to_thread(self._synthesize_blocking, voice, clean_text)
            return audio_bytes
        except Exception as e:
            raise ExternalServiceException(
                detail=f"TTS synthesis failed: {str(e)}",
                error_code="TTS_SYNTHESIS_ERROR"
            )

    @staticmethod
    def _synthesize_blocking(voice, text: str) -> bytes:
        """
        Blocking synthesis operation - called in thread pool.
        """
        import io
        import wave
        
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wav_file:
            voice.synthesize_wav(text, wav_file)
        
        return wav_io.getvalue()

    async def synthesize_and_store(
        self,
        text: str,
        language_code: str,
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> str:
        audio_bytes = await self.synthesize(text, language_code, voice_name, speaking_rate)
        destination_path = self._storage_service.generate_hash_path(audio_bytes, "wav")
        
        exists = await self._storage_service.exists(destination_path)
        if not exists:
            await self._storage_service.upload(
                data=audio_bytes,
                destination_path=destination_path,
                content_type="audio/wav"
            )
            
        return await self._storage_service.get_signed_url(destination_path)
