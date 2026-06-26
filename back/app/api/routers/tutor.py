import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from app.models.user import User
from app.models.tutor_session import TutorSession
from app.models.tutor_message import TutorMessage
from app.schemas.tutor import TutorSessionCreate, TutorSessionResponse, TutorMessageResponse
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
    get_tutor_message_repository
)
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
        session_repo = TutorSessionRepository(db)
        profile_repo = ProfileRepository(db)
        goals_repo = GoalsRepository(db)
        user_repo = UserRepository(db)
        
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "User inactive or not found"})
            await websocket.close(code=4001)
            return

        session_obj = await session_repo.get_by_id(session_id)
        if not session_obj:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "Session not found"})
            await websocket.close(code=4004)
            return
            
        if session_obj.user_id != user_id:
            await websocket.accept()
            await websocket.send_json({"type": "error", "content": "Forbidden: Session owner mismatch"})
            await websocket.close(code=4003)
            return

        profile = await profile_repo.get_by_user_id(user_id)
        goals_list = await goals_repo.get_by_user_id(user_id)
        goal_types = [g.goal_type for g in goals_list]

    await ws_manager.connect(websocket, user_id, session_id)

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
                    
                    try:
                        async for chunk in tutor_service.process_message(session_id, content, profile, goal_types):
                            await websocket.send_json({"type": "chunk", "content": chunk})
                        
                        rate_status = await rate_limiter.check_limit(user_id)
                        await websocket.send_json({
                            "type": "done",
                            "remaining": rate_status.remaining,
                            "reset_at": rate_status.reset_at.isoformat()
                        })
                    except Exception as err:
                        await websocket.send_json({"type": "error", "content": str(err)})
    except WebSocketDisconnect:
        import logging
        logging.getLogger("tutor").info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        import logging
        logging.getLogger("tutor").error(f"WebSocket error for user {user_id}: {str(e)}", exc_info=True)
    finally:
        await ws_manager.disconnect(user_id, session_id)
