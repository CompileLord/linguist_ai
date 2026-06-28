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
        # MediaRecorder produces Opus-in-WebM; the transformers pipeline sniffs
        # the container format from the bytes, so the suffix is just a hint.
        # EBML magic (WebM/Matroska) is 0x1A 0x45 0xDF 0xA3.
        is_webm = audio_bytes[:4] == b"\x1a\x45\xdf\xa3"
        suffix = ".webm" if is_webm else ".wav"
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)

        try:
            with open(temp_path, "wb") as f:
                f.write(audio_bytes)

            pipeline = get_whisper_pipeline()
            # Force English decoding when an English locale is requested so the
            # model doesn't wander into other languages on short clips.
            lang = "en" if language_code.lower().startswith("en") else None
            kwargs = {"chunk_length_s": 30, "task": "transcribe"}
            if lang:
                kwargs["language"] = lang
            result = await asyncio.to_thread(pipeline, temp_path, **kwargs)
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

    async def transcribe_pcm(
        self,
        pcm_bytes: bytes,
        language_code: str,
        sample_rate: int = 16000,
    ) -> TranscriptionResult:
        """Transcribe raw 16-bit little-endian PCM (mono) sampled at sample_rate.

        Used by the streaming speaking socket, which sends live mic packets
        rather than a self-describing container.
        """
        if not pcm_bytes:
            return TranscriptionResult(transcript="", confidence=1.0, word_timestamps=[])

        try:
            import numpy as np  # type: ignore
            audio = np.frombuffer(pcm_bytes, dtype="<i2").astype(np.float32) / 32768.0
        except Exception as e:
            raise ExternalServiceException(
                detail=f"STT PCM decode failed: {str(e)}",
                error_code="STT_DECODE_ERROR"
            )

        try:
            pipeline = get_whisper_pipeline()
            lang = "en" if language_code.lower().startswith("en") else None
            kwargs = {"chunk_length_s": 30, "task": "transcribe"}
            if lang:
                kwargs["language"] = lang
            result = await asyncio.to_thread(pipeline, audio, **kwargs)
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
