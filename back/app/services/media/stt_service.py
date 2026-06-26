import os
import tempfile
import asyncio
from app.core.exceptions import ExternalServiceException
from app.schemas.stt import TranscriptionResult, WordInfo

_whisper_pipeline = None

def get_whisper_pipeline():
    global _whisper_pipeline
    if _whisper_pipeline is None:
        from transformers import pipeline
        _whisper_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-base")
    return _whisper_pipeline

class SpeechToTextService:
    def __init__(self) -> None:
        pass

    async def transcribe(
        self,
        audio_bytes: bytes,
        language_code: str,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        fd, temp_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        
        try:
            with open(temp_path, "wb") as f:
                f.write(audio_bytes)
                
            pipeline = get_whisper_pipeline()
            result = await asyncio.to_thread(pipeline, temp_path, chunk_length_s=30)
            transcript = result.get("text", "").strip()
            
            return TranscriptionResult(
                transcript=transcript,
                confidence=1.0,
                word_timestamps=[]
            )
        except Exception as e:
            raise ExternalServiceException(
                detail=f"STT transcription failed: {str(e)}",
                error_code="STT_TRANSCRIPTION_ERROR"
            )
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    async def transcribe_from_uri(
        self,
        gcs_uri: str,
        language_code: str,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        raise ExternalServiceException(
            detail="transcribe_from_uri is not supported in local Whisper mode",
            error_code="STT_METHOD_NOT_SUPPORTED"
        )
