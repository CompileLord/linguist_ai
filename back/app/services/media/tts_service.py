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
        clean_text = text.strip()
        if clean_text.startswith("<speak>") and clean_text.endswith("</speak>"):
            clean_text = clean_text[7:-8].strip()

        fd, temp_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

        resolved_voice = voice_name or "hfc_female"
        if resolved_voice in VOICE_MAP:
            try:
                model_path = await self._ensure_voice_files(resolved_voice)
                model_name = str(model_path)
            except Exception as e:
                logger.error(f"Failed to ensure voice files: {e}")
                model_name = resolved_voice
        else:
            model_name = resolved_voice

        import sys
        piper_bin = Path(sys.executable).parent / "piper"
        piper_cmd = str(piper_bin) if piper_bin.exists() else "piper"

        try:
            process = await asyncio.create_subprocess_exec(
                piper_cmd,
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
