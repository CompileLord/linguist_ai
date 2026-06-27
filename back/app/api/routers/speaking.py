import uuid
import base64
import asyncio
import time
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session, db_manager
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user
from app.api.dependencies.services import (
    get_speaking_session_service,
    get_stt_service,
    get_tts_service,
    get_quota_tracking_service,
    get_gamification_repository,
    get_xp_calculation_service,
    get_streak_tracking_service,
    get_game_level_progression_service,
    get_achievement_service,
    get_vocabulary_extraction_service,
)
from app.services.speaking_session_service import SpeakingSessionService
from app.services.media.stt_service import SpeechToTextService
from app.services.media.tts_service import TextToSpeechService
from app.services.quota_tracking_service import QuotaTrackingService
from app.repositories.gamification_repository import GamificationRepository
from app.services.xp_calculation_service import XPCalculationService, ActionType
from app.services.streak_tracking_service import StreakTrackingService
from app.services.game_level_progression_service import GameLevelProgressionService
from app.services.achievement_service import AchievementService
from app.services.token_service import get_token_service
from app.services.ai.factory import get_ai_provider
from app.services.vocabulary_extraction_service import VocabularyExtractionService
from app.repositories.profile_repository import ProfileRepository
from app.repositories.user_repository import UserRepository
from app.repositories.language_repository import LanguageRepository

router = APIRouter(prefix="/speaking", tags=["Speaking"])
ws_router = APIRouter(tags=["Speaking"])


# --- Takeaways schemas ---

class TranscriptMessage(BaseModel):
    role: str
    content: str

class TakeawaysRequest(BaseModel):
    transcript: List[TranscriptMessage]

class SpeakingTakeaway(BaseModel):
    content: str = Field(..., description="Takeaway text")
    type: str = Field(..., description="Type: vocabulary, grammar, or tip")
    is_critical: bool = Field(..., description="Whether this should be added to review queue")
    word: Optional[str] = Field(None, description="The specific word (for vocabulary type)")
    translation: Optional[str] = Field(None, description="Translation of the word")

class TakeawaysResponse(BaseModel):
    summary: str
    takeaways: List[SpeakingTakeaway]

class _TakeawaysGenerated(BaseModel):
    summary: str = Field(..., description="2-3 sentence summary of the speaking session")
    takeaways: List[SpeakingTakeaway] = Field(..., description="3-6 key learning takeaways")


def _get_audio_duration(audio_bytes: bytes) -> float:
    """
    Get audio duration from WAV bytes. Runs in thread pool to avoid blocking.
    """
    import io
    import wave
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wav:
            frames = wav.getnframes()
            rate = wav.getframerate()
            return frames / float(rate)
    except Exception:
        return 2.0


@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_speaking(
    current_user: User = Depends(get_current_active_user),
    speaking_session_service: SpeakingSessionService = Depends(get_speaking_session_service)
):
    session_id = await speaking_session_service.start_speaking_session(current_user.id)
    return {"session_id": session_id}

@router.post("/end")
async def end_speaking(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    speaking_session_service: SpeakingSessionService = Depends(get_speaking_session_service),
    db: AsyncSession = Depends(get_db_session),
    xp_service: XPCalculationService = Depends(get_xp_calculation_service),
    streak_service: StreakTrackingService = Depends(get_streak_tracking_service),
    level_service: GameLevelProgressionService = Depends(get_game_level_progression_service),
    achievement_service: AchievementService = Depends(get_achievement_service)
):
    gamification_repo = GamificationRepository(db)
    duration_minutes = await speaking_session_service.complete_speaking_session(session_id)
    if duration_minutes > 0:
        xp_earned = xp_service.calculate_xp(ActionType.SPEAKING_SESSION)
        await gamification_repo.add_speaking_minutes(current_user.id, duration_minutes)
        await gamification_repo.add_xp(current_user.id, xp_earned)
        await streak_service.record_activity(current_user.id)
        await level_service.check_and_apply_level_up(current_user.id)
        await achievement_service.evaluate_and_award(current_user.id, "speaking_session")
        return {"duration_minutes": duration_minutes, "xp_earned": xp_earned}
    return {"duration_minutes": 0, "xp_earned": 0}

@router.post("/takeaways", response_model=TakeawaysResponse)
async def generate_takeaways(
    body: TakeawaysRequest,
    current_user: User = Depends(get_current_active_user),
    ai_provider = Depends(get_ai_provider),
    vocab_extraction: VocabularyExtractionService = Depends(get_vocabulary_extraction_service),
):
    """Generate summary and takeaways from a completed speaking session, saving critical vocab to review queue."""
    if not body.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    async with db_manager.get_session() as db:
        profile_repo = ProfileRepository(db)
        lang_repo = LanguageRepository(db)
        profile = await profile_repo.get_by_user_id(current_user.id)
        target_lang_code = "English"
        native_lang_code = "en"
        current_level = "A1"
        if profile:
            current_level = profile.current_level.value if profile.current_level else "A1"
            native_lang_code = profile.native_language_code or "en"
            if profile.target_language_id:
                lang = await lang_repo.get_by_id(profile.target_language_id)
                if lang:
                    target_lang_code = lang.name

    transcript_text = "\n".join(
        f"{'User' if m.role == 'user' else 'AI Coach'}: {m.content}"
        for m in body.transcript
    )

    prompt = (
        f"Analyze this speaking session transcript for a {current_level} level student learning {target_lang_code}.\n\n"
        f"Transcript:\n{transcript_text}\n\n"
        f"Generate a summary and learning takeaways. For vocabulary and grammar mistakes, set is_critical=true and they will be added to the review queue. "
        f"Translate any vocabulary words into {native_lang_code}."
    )

    try:
        result = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=_TakeawaysGenerated,
            system_instruction=(
                "You are a language learning coach. Analyze the speaking session and provide concise, actionable feedback. "
                "Identify vocabulary words to learn, grammar patterns to improve, and general tips. "
                "Mark as is_critical=true the most important items that the learner should review."
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # Save critical vocabulary items to review queue
    critical_vocab = [t for t in result.takeaways if t.is_critical and t.type == "vocabulary" and t.word]
    if critical_vocab and profile:
        vocab_text = " ".join(f"{t.word}: {t.content}" for t in critical_vocab)
        try:
            await vocab_extraction.extract_and_add_vocabulary(
                user_id=current_user.id,
                lesson_text=vocab_text,
                profile=profile,
                target_language_name=target_lang_code,
            )
        except Exception:
            pass  # Non-fatal: takeaways still returned even if saving fails

    return TakeawaysResponse(summary=result.summary, takeaways=result.takeaways)


@ws_router.websocket("/ws/speaking/{session_id}")
async def ws_speaking(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = None,
    stt_service: SpeechToTextService = Depends(get_stt_service),
    tts_service: TextToSpeechService = Depends(get_tts_service),
    ai_provider = Depends(get_ai_provider)
):
    token_service = get_token_service()
    if not token:
        token = websocket.query_params.get("token")
    if not token:
        await websocket.accept()
        await websocket.send_json({"type": "error", "content": "Authentication token missing"})
        await websocket.close(code=4001)
        return

    try:
        payload = token_service.decode_token(token)
        user_id = uuid.UUID(payload.sub)
    except Exception as e:
        await websocket.accept()
        await websocket.send_json({"type": "error", "content": f"Authentication failed: {str(e)}"})
        await websocket.close(code=4001)
        return

    async with db_manager.get_session() as db:
        user_repo = UserRepository(db)
        profile_repo = ProfileRepository(db)
        lang_repo = LanguageRepository(db)
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "User inactive or not found"})
            await websocket.close(code=4001)
            return

        profile = await profile_repo.get_by_user_id(user_id)
        if not profile:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "User profile not found"})
            await websocket.close(code=4004)
            return

        target_lang = await lang_repo.get_by_id(profile.target_language_id)
        target_lang_code = "en-US"
        if target_lang and target_lang.code == "ru":
            target_lang_code = "ru-RU"

    await websocket.accept()

    conversation_history = [
        {"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTION: You are a friendly AI speaking coach. The user's target language code is {target_lang_code} and current level is {profile.current_level or 'A1'}. Speak in clear, natural, and simple language suitable for this level. Keep your responses short (1-3 sentences) and conversational. Do not use complex markdown formatting or bullet points."}]},
        {"role": "model", "parts": [{"text": "Understood. I will act as the AI Speaking coach according to these instructions."}]}
    ]

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            text_to_process = None

            if msg_type == "audio":
                audio_base64 = data.get("data")
                if not audio_base64:
                    await websocket.send_json({"type": "error", "content": "Audio data missing"})
                    continue
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                    transcription = await stt_service.transcribe(audio_bytes, language_code=target_lang_code)
                    if not transcription.transcript:
                        await websocket.send_json({"type": "error", "content": "No speech detected"})
                        continue
                    await websocket.send_json({"type": "transcription", "content": transcription.transcript})
                    text_to_process = transcription.transcript
                except Exception as e:
                    await websocket.send_json({"type": "error", "content": f"STT failed: {str(e)}"})
                    continue

            elif msg_type == "text":
                text_to_process = data.get("content")
                if not text_to_process:
                    continue

            if text_to_process:
                conversation_history.append({"role": "user", "parts": [{"text": text_to_process}]})

                accumulated_text = ""
                sentence_buffer = ""
                playback_finish_time = time.time()

                try:
                    async for chunk in ai_provider.generate_content_stream(conversation_history):
                        accumulated_text += chunk
                        sentence_buffer += chunk
                        await websocket.send_json({"type": "chunk", "content": chunk})

                        while True:
                            boundary_idx = -1
                            for i, char in enumerate(sentence_buffer):
                                if char in (".", "?", "!"):
                                    if i + 1 < len(sentence_buffer) and sentence_buffer[i+1] in (".", "?", "!"):
                                        continue
                                    boundary_idx = i
                                    break
                            
                            if boundary_idx == -1:
                                break
                            
                            sentence = sentence_buffer[:boundary_idx + 1].strip()
                            sentence_buffer = sentence_buffer[boundary_idx + 1:]
                            
                            if sentence:
                                audio_bytes = await tts_service.synthesize(
                                    text=sentence,
                                    language_code=target_lang.code if target_lang else "en",
                                    voice_name=user.voice_name
                                )
                                if audio_bytes and len(audio_bytes) > 44:
                                    # FIXED: Offload blocking wave operation to thread pool
                                    duration = await asyncio.to_thread(_get_audio_duration, audio_bytes)
                                    
                                    now = time.time()
                                    if now < playback_finish_time:
                                        await asyncio.sleep(playback_finish_time - now)
                                        playback_finish_time += duration
                                    else:
                                        playback_finish_time = now + duration
                                    
                                    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                                    await websocket.send_json({"type": "audio", "data": audio_base64})
                except Exception as e:
                    await websocket.send_json({"type": "error", "content": f"AI model error: {str(e)}"})
                    continue

                conversation_history.append({"role": "model", "parts": [{"text": accumulated_text}]})

                remaining_sentence = sentence_buffer.strip()
                if remaining_sentence:
                    try:
                        audio_bytes = await tts_service.synthesize(
                            text=remaining_sentence,
                            language_code=target_lang.code if target_lang else "en",
                            voice_name=user.voice_name
                        )
                        if audio_bytes and len(audio_bytes) > 44:
                            # FIXED: Offload blocking wave operation to thread pool
                            duration = await asyncio.to_thread(_get_audio_duration, audio_bytes)
                            
                            now = time.time()
                            if now < playback_finish_time:
                                await asyncio.sleep(playback_finish_time - now)
                                playback_finish_time += duration
                            else:
                                playback_finish_time = now + duration
                            
                            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
                            await websocket.send_json({"type": "audio", "data": audio_base64})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "content": f"TTS synthesis failed: {str(e)}"})

                await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
