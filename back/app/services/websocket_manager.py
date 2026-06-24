import uuid
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger("websocket")

class WebSocketConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[uuid.UUID, Dict[uuid.UUID, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        self.active_connections[user_id][session_id] = websocket
        logger.info(f"Connected: user_id={user_id}, session_id={session_id}")

    async def disconnect(self, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        if user_id in self.active_connections:
            if session_id in self.active_connections[user_id]:
                del self.active_connections[user_id][session_id]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"Disconnected: user_id={user_id}, session_id={session_id}")

    async def send_personal_message(self, message: str, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        if user_id in self.active_connections and session_id in self.active_connections[user_id]:
            await self.active_connections[user_id][session_id].send_text(message)

    async def broadcast_to_user(self, message: str, user_id: uuid.UUID) -> None:
        if user_id in self.active_connections:
            for session_id, websocket in self.active_connections[user_id].items():
                try:
                    await websocket.send_text(message)
                except Exception:
                    pass

    @property
    def active_connections_count(self) -> int:
        count = 0
        for u_id in self.active_connections:
            count += len(self.active_connections[u_id])
        return count

    def get_user_sessions(self, user_id: uuid.UUID) -> List[uuid.UUID]:
        if user_id in self.active_connections:
            return list(self.active_connections[user_id].keys())
        return []
