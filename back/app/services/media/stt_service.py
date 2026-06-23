from google.cloud import speech
from google.api_core.exceptions import GoogleAPIError
from app.core.exceptions import ExternalServiceException
from app.schemas.stt import TranscriptionResult, WordInfo

class SpeechToTextService:
    def __init__(self) -> None:
        try:
            self.client = speech.SpeechClient()
        except Exception:
            self.client = None

    def _get_client(self) -> speech.SpeechClient:
        if not self.client:
            raise ExternalServiceException(
                detail="Speech-to-Text client is not initialized",
                error_code="STT_CLIENT_NOT_INITIALIZED"
            )
        return self.client

    def _process_response(self, response: speech.RecognizeResponse) -> TranscriptionResult:
        transcript = ""
        confidence = 0.0
        word_timestamps = []

        if not response.results:
            return TranscriptionResult(
                transcript="",
                confidence=0.0,
                word_timestamps=[]
            )

        best_alternative = response.results[0].alternatives[0]
        transcript = best_alternative.transcript
        confidence = best_alternative.confidence

        for result in response.results:
            alternative = result.alternatives[0]
            for word_info in alternative.words:
                word_timestamps.append(
                    WordInfo(
                        word=word_info.word,
                        start_time=word_info.start_time.total_seconds(),
                        end_time=word_info.end_time.total_seconds()
                    )
                )

        return TranscriptionResult(
            transcript=transcript,
            confidence=confidence,
            word_timestamps=word_timestamps
        )

    async def transcribe(
        self,
        audio_bytes: bytes,
        language_code: str,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        client = self._get_client()
        
        audio = speech.RecognitionAudio(content=audio_bytes)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_word_time_offsets=True
        )

        try:
            if len(audio_bytes) < 1024 * 1024:  # roughly <60 seconds
                response = client.recognize(config=config, audio=audio)
                return self._process_response(response)
            else:
                operation = client.long_running_recognize(config=config, audio=audio)
                response = operation.result(timeout=300)
                return self._process_response(response)
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"STT transcription failed: {str(e)}",
                error_code="STT_TRANSCRIPTION_ERROR"
            )

    async def transcribe_from_uri(
        self,
        gcs_uri: str,
        language_code: str,
        sample_rate: int = 16000
    ) -> TranscriptionResult:
        client = self._get_client()
        
        audio = speech.RecognitionAudio(uri=gcs_uri)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=sample_rate,
            language_code=language_code,
            enable_word_time_offsets=True
        )

        try:
            operation = client.long_running_recognize(config=config, audio=audio)
            response = operation.result(timeout=300)
            return self._process_response(response)
        except GoogleAPIError as e:
            raise ExternalServiceException(
                detail=f"STT GCS transcription failed: {str(e)}",
                error_code="STT_TRANSCRIPTION_ERROR"
            )
