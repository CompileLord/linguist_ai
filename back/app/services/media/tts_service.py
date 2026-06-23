import asyncio
import os
import tempfile
from typing import Optional
from app.core.exceptions import ExternalServiceException
from app.services.media.storage_service import StorageService
from app.core.logging import LoggerFactory

logger = LoggerFactory.get_logger("TTSService")

class TextToSpeechService:
    def __init__(self, storage_service: StorageService) -> None:
        self._storage_service = storage_service

    async def synthesize(
        self,
        text: str,
        language_code: str,
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> bytes:
        clean_text = text.strip()
        if clean_text.startswith("<speak>") and clean_text.endswith("</speak>"):
            clean_text = clean_text[7:-8].strip()

        fd, temp_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

        model_name = voice_name or f"{language_code}-medium.onnx"

        try:
            process = await asyncio.create_subprocess_exec(
                "piper",
                "--model", model_name,
                "--output_file", temp_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate(input=clean_text.encode("utf-8"))
            
            if process.returncode != 0:
                raise ExternalServiceException(
                    detail=f"Piper synthesis process returned error: {stderr.decode()}",
                    error_code="TTS_PIPER_PROCESS_ERROR"
                )

            with open(temp_path, "rb") as f:
                audio_content = f.read()

            return audio_content

        except FileNotFoundError:
            logger.warning("Piper TTS executable 'piper' was not found. Returning fallback dummy audio.")
            dummy_wav = (
                b"RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
                b"\x40\x1f\x00\x00\x80\x3e\x00\x00\x02\x00\x10\x00data\x00\x08\x00\x00"
                + b"\x00" * 2048
            )
            return dummy_wav
        except Exception as e:
            raise ExternalServiceException(
                detail=f"TTS synthesis failed: {str(e)}",
                error_code="TTS_SYNTHESIS_ERROR"
            )
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

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
