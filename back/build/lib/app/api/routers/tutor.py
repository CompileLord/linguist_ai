import uuid
import asyncio
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status, UploadFile, File, Response

ws_logger = logging.getLogger("tutor.websocket")
from app.models.user import User
from app.models.tutor_session import TutorSession
from app.models.tutor_message import TutorMessage
from app.schemas.tutor import TutorSessionCreate, TutorSessionResponse, TutorMessageResponse, CorrectionRequest, CorrectionResponse, CorrectionIssue
from app.api.dependencies.auth import get_current_active_user
from app.services.websocket_manager import WebSocketConnectionManager
from app.services.tutor_prompt_builder import TutorPromptBuilder
from app.services.session_context_manager import SessionContextManager
from app.services.tutor_rate_limiter import TutorRateLimiter
from app.services.tutor_service import TutorService
from app.services.ai.factory import get_ai_provider
from app.services.ai.prompts import get_prompt_manager
from app.repositories.tutor_session_repository import TutorSessionRepository
from app.repositories.tutor_message_repository import TutorMessageRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.goals_repository import GoalsRepository
from app.repositories.user_repository import UserRepository
from app.api.dependencies.services import (
    get_websocket_manager,
    get_tutor_session_repository,
    get_tutor_message_repository,
    get_tts_service,
    get_stt_service,
)
from app.services.media.tts_service import TextToSpeechService
from app.services.media.stt_service import SpeechToTextService
from app.services.token_service import get_token_service
from app.core.database import db_manager
from app.core.exceptions import SessionNotFoundError

router = APIRouter(prefix="/tutor", tags=["Tutor"])
ws_router = APIRouter(tags=["Tutor"])

@router.post("/sessions", response_model=TutorSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: TutorSessionCreate,
    current_user: User = Depends(get_current_active_user),
    session_repo: TutorSessionRepository = Depends(get_tutor_session_repository)
):
    session_obj = TutorSession(
        user_id=current_user.id,
        title=session_in.title,
        active_lesson_id=session_in.active_lesson_id,
        topic_context=session_in.topic_context,
        is_active=True
    )
    return await session_repo.create(session_obj)

@router.get("/sessions/active", response_model=Optional[TutorSessionResponse])
async def get_active_session(
    current_user: User = Depends(get_current_active_user),
    session_repo: TutorSessionRepository = Depends(get_tutor_session_repository)
):
    return await session_repo.get_active_session(current_user.id)

@router.get("/sessions", response_model=List[TutorSessionResponse])
async def list_sessions(
    skip: int = 0,
    limit: int = 100,
    include_ended: bool = False,
    current_user: User = Depends(get_current_active_user),
    session_repo: TutorSessionRepository = Depends(get_tutor_session_repository)
):
    return await session_repo.list_by_user(current_user.id, skip=skip, limit=limit, include_ended=include_ended)

@router.post("/sessions/{id}/end", response_model=TutorSessionResponse)
async def end_session(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    session_repo: TutorSessionRepository = Depends(get_tutor_session_repository)
):
    sess = await session_repo.get_by_id(id)
    if not sess or sess.user_id != current_user.id:
        raise SessionNotFoundError()
    return await session_repo.end_session(id)

@router.get("/sessions/{id}/messages", response_model=List[TutorMessageResponse])
async def list_messages(
    id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
    order: str = "asc",
    current_user: User = Depends(get_current_active_user),
    session_repo: TutorSessionRepository = Depends(get_tutor_session_repository),
    message_repo: TutorMessageRepository = Depends(get_tutor_message_repository)
):
    sess = await session_repo.get_by_id(id)
    if not sess or sess.user_id != current_user.id:
        raise SessionNotFoundError()
    return await message_repo.list_by_session(id, limit=limit, offset=offset, order=order)

@router.post("/correct", response_model=CorrectionResponse)
async def correct_text(
    body: CorrectionRequest,
    current_user: User = Depends(get_current_active_user),
    ai_provider = Depends(get_ai_provider)
):
    system_prompt = (
        "You are a strict but encouraging language tutor. "
        "Analyze the user's text for grammar, spelling, word choice, and fluency issues. "
        "Return ONLY valid JSON matching this exact schema (no markdown, no extra text):\n"
        '{"original_text":"<as provided>","corrected_text":"<corrected>","is_correct":<true|false>,'
        '"overall_feedback":"<1-2 sentence feedback>","fluency_score":<1-10>,'
        '"issues":[{"original":"<wrong phrase>","corrected":"<right phrase>","explanation":"<why>","type":"<grammar|spelling|word_choice|fluency>"}]}'
    )
    user_prompt = f"Analyze this {body.target_language} text:\n\n\"{body.text}\""

    from app.services.ai.base import GenerationConfig
    config = GenerationConfig(
        temperature=0.3,
        max_output_tokens=1024,
        response_mime_type="application/json"
    )

    raw = await ai_provider.generate_content(
        user_prompt,
        system_instruction=system_prompt,
        config=config
    )

    try:
        data = json.loads(raw)
        issues = [CorrectionIssue(**i) for i in data.get("issues", [])]
        return CorrectionResponse(
            original_text=data.get("original_text", body.text),
            corrected_text=data.get("corrected_text", body.text),
            is_correct=data.get("is_correct", True),
            overall_feedback=data.get("overall_feedback", ""),
            issues=issues,
            fluency_score=int(data.get("fluency_score", 7))
        )
    except Exception:
        return CorrectionResponse(
            original_text=body.text,
            corrected_text=body.text,
            is_correct=True,
            overall_feedback="Could not analyze the text at this time.",
            issues=[],
            fluency_score=5
        )


@router.post("/translate")
async def translate_text(
    body: dict,
    current_user: User = Depends(get_current_active_user),
    ai_provider = Depends(get_ai_provider),
):
    text = body.get("text", "").strip()
    target_lang = body.get("target_language", "Russian")
    if not text:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="text is required")

    raw = await ai_provider.generate_content(
        f"Translate to {target_lang}:\n\n{text}",
        system_instruction=(
            f"You are a professional translator. Translate the given English text to {target_lang}. "
            "Output ONLY the translation, with no preamble, no explanation, no quotes."
        ),
    )
    return {"translation": raw.strip()}


@router.post("/tts")
async def text_to_speech(
    body: dict,
    current_user: User = Depends(get_current_active_user),
    tts_service: TextToSpeechService = Depends(get_tts_service),
):
    text = body.get("text", "").strip()
    if not text:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="text is required")
    voice = current_user.voice_name or "hfc_female"
    audio_bytes = await tts_service.synthesize(text=text, language_code="en-US", voice_name=voice)
    return Response(content=audio_bytes, media_type="audio/wav", headers={"Cache-Control": "no-store"})


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    stt_service: SpeechToTextService = Depends(get_stt_service),
):
    audio_bytes = await audio.read()
    result = await stt_service.transcribe(audio_bytes=audio_bytes, language_code="en-US")
    return {"transcript": result.transcript}


@ws_router.websocket("/ws/stt")
async def ws_stt(
    websocket: WebSocket,
    token: Optional[str] = None,
    stt_service: SpeechToTextService = Depends(get_stt_service),
):
    """Streaming speech-to-text over WebSocket.

    Protocol:
      - client sends JSON {"type":"start","language":"en-US"} to (re)initialize
      - client sends binary frames of audio chunks (e.g. Opus-in-WebM)
      - client sends JSON {"type":"stop"} to finalize and request a transcript
      - server responds with {"type":"transcript","content":"..."} or
        {"type":"error","content":"..."}
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
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "User inactive or not found"})
            await websocket.close(code=4001)
            return

    await websocket.accept()
    audio_buffer = bytearray()
    language_code = "en-US"

    try:
        while True:
            msg = await websocket.receive()
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
                language_code = data.get("language") or "en-US"
                await websocket.send_json({"type": "ready", "language": language_code})
            elif msg_type == "stop":
                if audio_buffer:
                    try:
                        result = await stt_service.transcribe(
                            audio_bytes=bytes(audio_buffer),
                            language_code=language_code,
                        )
                        await websocket.send_json({"type": "transcript", "content": result.transcript})
                    except Exception as err:
                        await websocket.send_json({"type": "error", "content": f"STT failed: {str(err)}"})
                else:
                    await websocket.send_json({"type": "transcript", "content": ""})
                audio_buffer.clear()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@ws_router.websocket("/ws/tutor/{session_id}")
async def ws_tutor(
    websocket: WebSocket,
    session_id: uuid.UUID,
    token: Optional[str] = None,
    ws_manager: WebSocketConnectionManager = Depends(get_websocket_manager),
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
        user = await UserRepository(db).get_by_id(user_id)
        if not user or not user.is_active:
            ws_logger.warning("[tutor-ws] CLOSE 4001: user inactive/not found user_id=%s", user_id)
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "User inactive or not found"})
            await websocket.close(code=4001)
            return

    # Retry the session lookup: the HTTP response that gave the client this
    # session_id is sent before FastAPI's yield-dependency commit runs, so the
    # session may not yet be visible on the first query. Use a FRESH session per
    # attempt — reusing one session keeps the same transaction snapshot and would
    # never observe the row committed by the other request.
    session_obj = None
    for _attempt in range(20):
        async with db_manager.get_session() as db:
            session_obj = await TutorSessionRepository(db).get_by_id(session_id)
        if session_obj:
            break
        await asyncio.sleep(0.05)

    if not session_obj:
        ws_logger.error("Session %s not found after retries for user %s", session_id, user_id)
        await websocket.accept()
        await websocket.send_json({"type": "error", "content": "Session not found"})
        await websocket.close(code=4004)
        return

    if session_obj.user_id != user_id:
        ws_logger.warning("[tutor-ws] CLOSE 4003: owner mismatch session_owner=%s connecting_user=%s", session_obj.user_id, user_id)
        await websocket.accept()
        await websocket.send_json({"type": "error", "content": "Forbidden: Session owner mismatch"})
        await websocket.close(code=4003)
        return

    async with db_manager.get_session() as db:
        profile = await ProfileRepository(db).get_by_user_id(user_id)
        goals_list = await GoalsRepository(db).get_by_user_id(user_id)
        goal_types = [g.goal_type for g in goals_list]

    if profile is None:
        ws_logger.warning("[tutor-ws] profile is None for user_id=%s — process_message may fail", user_id)

    await ws_manager.connect(websocket, user_id, session_id)
    ws_logger.info("[tutor-ws] OPEN: receive loop started user_id=%s session=%s", user_id, session_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg_type == "end_session":
                async with db_manager.get_session() as db:
                    session_repo = TutorSessionRepository(db)
                    await session_repo.end_session(session_id)
                await websocket.send_json({"type": "session_ended"})
                break
            elif msg_type == "message":
                content = data.get("content")
                if not content:
                    continue

                try:
                    async with asyncio.timeout(90):
                        async with db_manager.get_session() as db:
                            session_repo = TutorSessionRepository(db)
                            message_repo = TutorMessageRepository(db)
                            prompt_builder = TutorPromptBuilder(get_prompt_manager())
                            profile_repo = ProfileRepository(db)
                            goals_repo = GoalsRepository(db)
                            context_manager = SessionContextManager(
                                session_repo, message_repo, prompt_builder, profile_repo, goals_repo
                            )
                            rate_limiter = TutorRateLimiter(db)

                            tutor_service = TutorService(
                                session_repo, message_repo, context_manager, rate_limiter, ai_provider
                            )

                            async for chunk in tutor_service.process_message(session_id, content, profile, goal_types):
                                await websocket.send_json({"type": "chunk", "content": chunk})

                            rate_status = await rate_limiter.check_limit(user_id)
                            await websocket.send_json({
                                "type": "done",
                                "remaining": rate_status.remaining,
                                "reset_at": rate_status.reset_at.isoformat()
                            })
                except WebSocketDisconnect:
                    raise
                except asyncio.TimeoutError:
                    ws_logger.error("Tutor generation timed out for session %s", session_id)
                    try:
                        await websocket.send_json({"type": "error", "content": "The response timed out — please try again."})
                    except Exception:
                        pass
                except Exception:
                    # Always surface a failure to the client so its "thinking"
                    # state clears; keep the connection alive for the next message.
                    ws_logger.exception("Error processing tutor message for session %s", session_id)
                    try:
                        await websocket.send_json({"type": "error", "content": "Sorry, something went wrong generating a response. Please try again."})
                    except Exception:
                        pass
    except WebSocketDisconnect:
        pass
    except Exception:
        ws_logger.exception("Unexpected error in tutor WebSocket handler — closing connection")
    finally:
        await ws_manager.disconnect(user_id, session_id)
