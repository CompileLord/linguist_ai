import os
import uuid
import random
from typing import List, Optional, Dict
from google.cloud import texttospeech, storage
from app.models.listening_exam import ListeningExam
from app.models.user_listening_attempt import UserListeningAttempt
from app.models.enums import CEFRLevel
from app.schemas.listening_exam import (
    ListeningExamAI,
    ListeningExamDetailsResponse,
    ListeningQuestionClient,
    ListeningSubmitResponse,
    ListeningQuestionResult
)
from app.repositories.listening_exam_repository import ListeningExamRepository
from app.services.ai.base import AbstractAIProvider
from app.services.ai.prompts import PromptManager
from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException, ExternalServiceException

class ListeningExamScriptGenerationService:
    def __init__(self, ai_provider: AbstractAIProvider, prompt_manager: PromptManager):
        self._ai_provider = ai_provider
        self._prompt_manager = prompt_manager
        self._types = ["dialogue", "monologue", "news_report", "announcement", "interview"]

    async def generate_script_and_questions(
        self,
        target_language: str,
        level: CEFRLevel,
        scenario_type: Optional[str] = None
    ) -> ListeningExamAI:
        if not scenario_type:
            scenario_type = random.choice(self._types)

        prompt = self._prompt_manager.render(
            "exams/listening_script",
            target_language=target_language,
            level=level.value,
            scenario_type=scenario_type
        )

        for attempt in range(2):
            try:
                result = await self._ai_provider.generate_structured(
                    prompt=prompt,
                    response_schema=ListeningExamAI
                )
                return result
            except Exception as e:
                if attempt == 1:
                    raise ExternalServiceException(
                        detail=f"Listening script generation failed: {str(e)}",
                        error_code="LISTENING_GENERATION_FAILED"
                    )

class ListeningAudioService:
    async def generate_audio(self, exam: ListeningExam, language_code: str) -> str:
        if exam.audio_url:
            return exam.audio_url

        speaking_rate = 1.0
        if exam.level in [CEFRLevel.A1, CEFRLevel.A2]:
            speaking_rate = 0.8
        elif exam.level in [CEFRLevel.C1, CEFRLevel.C2]:
            speaking_rate = 1.1

        voice_map = {
            "en": ("en-US", "en-US-Wavenet-F"),
            "ru": ("ru-RU", "ru-RU-Wavenet-A"),
            "es": ("es-ES", "es-ES-Standard-A")
        }

        lang_code, voice_name = voice_map.get(language_code, (f"{language_code}-{language_code.upper()}", None))

        try:
            tts_client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(text=exam.script_text)
            
            if voice_name:
                voice = texttospeech.VoiceSelectionParams(language_code=lang_code, name=voice_name)
            else:
                voice = texttospeech.VoiceSelectionParams(language_code=lang_code)

            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=speaking_rate
            )

            response = tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )

            bucket_name = os.getenv("GCS_BUCKET_NAME", "linguist-ai-exams")
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(f"listening-exams/{exam.id}/audio.mp3")
            blob.upload_from_string(response.audio_content, content_type="audio/mpeg")
            
            exam.audio_url = blob.public_url
            return exam.audio_url
        except Exception as e:
            raise ExternalServiceException(
                detail=f"Failed to generate listening audio: {str(e)}",
                error_code="LISTENING_AUDIO_FAILED"
            )

class ListeningExamService:
    def __init__(
        self,
        repository: ListeningExamRepository,
        script_service: ListeningExamScriptGenerationService,
        audio_service: ListeningAudioService
    ):
        self._repository = repository
        self._script_service = script_service
        self._audio_service = audio_service

    async def get_exam_for_user(self, user_id: uuid.UUID, exam_id: uuid.UUID) -> ListeningExamDetailsResponse:
        exam = await self._repository.get_by_id(exam_id)
        if not exam:
            raise NotFoundException(detail="Listening exam not found")

        client_questions = []
        for q in exam.questions:
            client_questions.append(
                ListeningQuestionClient(
                    question_text=q["question_text"],
                    options=q["options"]
                )
            )

        return ListeningExamDetailsResponse(
            id=exam.id,
            language_id=exam.language_id,
            level=exam.level,
            audio_url=exam.audio_url,
            questions=client_questions
        )

    async def submit_answers(
        self,
        user_id: uuid.UUID,
        exam_id: uuid.UUID,
        answers: Dict[int, int]
    ) -> ListeningSubmitResponse:
        exam = await self._repository.get_by_id(exam_id)
        if not exam:
            raise NotFoundException(detail="Listening exam not found")

        completed = await self._repository.has_user_completed(user_id, exam_id)
        if completed:
            raise ConflictException(detail="Listening exam already completed")

        total_questions = len(exam.questions)
        if total_questions == 0:
            raise ValidationException(detail="Exam has no questions")

        correct_count = 0
        results = []

        for idx, q in enumerate(exam.questions):
            correct_idx = q["correct_answer_index"]
            selected_idx = answers.get(idx)
            is_correct = (selected_idx is not None) and (int(selected_idx) == correct_idx)
            
            if is_correct:
                correct_count += 1
                
            results.append(
                ListeningQuestionResult(
                    question_index=idx,
                    correct=is_correct,
                    correct_answer_index=correct_idx,
                    explanation=q["explanation"]
                )
            )

        score = (correct_count / total_questions) * 100.0

        attempt = UserListeningAttempt(
            user_id=user_id,
            exam_id=exam_id,
            answers={str(k): v for k, v in answers.items()},
            score=score
        )
        await self._repository.create_attempt(attempt)

        return ListeningSubmitResponse(
            score=score,
            results=results
        )

    async def get_transcript(self, user_id: uuid.UUID, exam_id: uuid.UUID) -> str:
        exam = await self._repository.get_by_id(exam_id)
        if not exam:
            raise NotFoundException(detail="Listening exam not found")

        completed = await self._repository.has_user_completed(user_id, exam_id)
        if not completed:
            raise ForbiddenException(detail="Complete the exam to view transcript")

        return exam.script_text
