import uuid
import asyncio
import json
from typing import Optional, List, Dict, Any
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
    """Hands-free speaking pipeline over a single persistent WebSocket.

    Upstream (client -> server):
      - binary frames: raw 16-bit PCM @ 16kHz mono (streamed while the user
        is speaking, detected by the frontend VAD)
      - JSON {"type":"start"}             : reset audio buffer
      - JSON {"type":"end_of_speech"}     : finalize -> transcribe -> respond
      - JSON {"type":"interrupt"}         : barge-in, cancel generation + audio
      - JSON {"type":"ping"}

    Downstream (server -> client):
      - JSON {"type":"ready"}
      - JSON {"type":"state","state":"processing"|"ai_speaking"}
      - JSON {"type":"transcription","content":...}
      - JSON {"type":"chunk","content":...}        (LLM token stream / subtitle)
      - binary frames                                (Piper WAV per sentence)
      - JSON {"type":"done"}
      - JSON {"type":"interrupted"}
      - JSON {"type":"error","content":...}
    """
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

    tts_lang_code = target_lang.code if target_lang else "en"
    tts_voice = user.voice_name

    await websocket.accept()
    await websocket.send_json({"type": "ready"})

    conversation_history: List[Dict[str, Any]] = [
        {"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTION: You are a friendly AI speaking coach. The user's target language code is {target_lang_code} and current level is {profile.current_level or 'A1'}. Speak in clear, natural, and simple language suitable for this level. Keep your responses short (1-3 sentences) and conversational. Do not use complex markdown formatting or bullet points."}]},
        {"role": "model", "parts": [{"text": "Understood. I will act as the AI Speaking coach according to these instructions."}]}
    ]

    audio_buffer = bytearray()
    generation_task: Optional[asyncio.Task] = None

    async def _cancel_generation() -> None:
        nonlocal generation_task
        if generation_task is not None and not generation_task.done():
            generation_task.cancel()
            try:
                await generation_task
            except (asyncio.CancelledError, Exception):
                pass
        generation_task = None

    async def _synthesize_and_send(sentence: str) -> None:
        if not sentence:
            return
        try:
            audio_bytes = await tts_service.synthesize(
                text=sentence,
                language_code=tts_lang_code,
                voice_name=tts_voice,
            )
        except Exception as e:
            await websocket.send_json({"type": "error", "content": f"TTS failed: {str(e)}"})
            return
        if audio_bytes and len(audio_bytes) > 44:
            await websocket.send_bytes(audio_bytes)

    async def _run_generation(text: str) -> None:
        conversation_history.append({"role": "user", "parts": [{"text": text}]})
        accumulated = ""
        sentence_buffer = ""

        try:
            async for chunk in ai_provider.generate_content_stream(conversation_history):
                accumulated += chunk
                sentence_buffer += chunk
                await websocket.send_json({"type": "chunk", "content": chunk})

                # Flush complete sentences to TTS as soon as they arrive so
                # audio starts flowing before the LLM finishes the turn.
                while True:
                    boundary = -1
                    for i, ch in enumerate(sentence_buffer):
                        if ch in (".", "?", "!") and not (
                            i + 1 < len(sentence_buffer) and sentence_buffer[i + 1] in (".", "?", "!")
                        ):
                            boundary = i
                            break
                    if boundary == -1:
                        break
                    sentence = sentence_buffer[:boundary + 1].strip()
                    sentence_buffer = sentence_buffer[boundary + 1:]
                    await _synthesize_and_send(sentence)

            # Synthesize any trailing fragment.
            await _synthesize_and_send(sentence_buffer.strip())

            conversation_history.append({"role": "model", "parts": [{"text": accumulated}]})
            await websocket.send_json({"type": "done"})
        except asyncio.CancelledError:
            # Barge-in: keep any partial model turn so context isn't lost.
            if accumulated:
                conversation_history.append({"role": "model", "parts": [{"text": accumulated}]})
            raise

    try:
        while True:
            msg = await websocket.receive()

            # Binary frame: raw PCM packet from the user's mic.
            if msg.get("bytes") is not None:
                audio_buffer.extend(msg["bytes"])
                continue

            text = msg.get("text")
            if not text:
                continue
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "start":
                audio_buffer.clear()
                await websocket.send_json({"type": "ready"})

            elif msg_type == "end_of_speech":
                # Ignore if a turn is already in flight (frontend should be in
                # processing/ai_speaking state and not emitting this).
                if generation_task is not None and not generation_task.done():
                    continue
                pcm = bytes(audio_buffer)
                audio_buffer.clear()
                if not pcm:
                    await websocket.send_json({"type": "error", "content": "No audio captured"})
                    continue

                await websocket.send_json({"type": "state", "state": "processing"})
                try:
                    transcription = await stt_service.transcribe_pcm(
                        pcm_bytes=pcm, language_code=target_lang_code
                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "content": f"STT failed: {str(e)}"})
                    continue

                if not transcription.transcript:
                    await websocket.send_json({"type": "done"})
                    continue

                await websocket.send_json({"type": "transcription", "content": transcription.transcript})
                generation_task = asyncio.create_task(_run_generation(transcription.transcript))

            elif msg_type == "interrupt":
                await _cancel_generation()
                audio_buffer.clear()
                await websocket.send_json({"type": "interrupted"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
    finally:
        await _cancel_generation()
