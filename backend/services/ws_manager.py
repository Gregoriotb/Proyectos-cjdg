"""
[CONTEXT: REALTIME] - WebSocket Connection Manager
SC-WS-01: Single connection per user (multi-tab supported), event broadcast.

Eventos server → client:
  - {"type": "notification", "payload": {...notification}}
  - {"type": "chat_message", "payload": {...message, thread_id}}
  - {"type": "thread_updated", "payload": {thread_id, ...changes}}

Acciones client → server:
  - {"action": "ping"} → {"type": "pong"}
  - {"action": "subscribe_thread", "thread_id": "..."}
  - {"action": "unsubscribe_thread", "thread_id": "..."}
"""
import asyncio
import logging
from collections import defaultdict
from typing import Any, Dict, Set
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger("cjdg.ws")


class WSManager:
    """In-memory connection registry. Single-process safe.

    Para escalar a multi-worker, reemplazar por Redis pub/sub. Por ahora
    Railway corre un solo worker y este manager es suficiente.
    """

    def __init__(self) -> None:
        # user_id → set de WebSockets activos (multi-tab por usuario)
        self.connections: Dict[UUID, Set[WebSocket]] = defaultdict(set)
        # user_id → True si es admin (cache cuando se conecta)
        self.is_admin: Dict[UUID, bool] = {}
        # thread_id → set de user_ids suscritos a esa conversación
        self.thread_subscribers: Dict[UUID, Set[UUID]] = defaultdict(set)
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    async def connect(self, websocket: WebSocket, user_id: UUID, is_admin: bool) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections[user_id].add(websocket)
            self.is_admin[user_id] = is_admin
        logger.info("WS connect user=%s admin=%s total_conns=%d", user_id, is_admin, self._total_count())

    async def disconnect(self, websocket: WebSocket, user_id: UUID) -> None:
        async with self._lock:
            conns = self.connections.get(user_id)
            if conns:
                conns.discard(websocket)
                if not conns:
                    self.connections.pop(user_id, None)
                    self.is_admin.pop(user_id, None)
                    # Limpiar suscripciones del usuario
                    for tid, users in list(self.thread_subscribers.items()):
                        users.discard(user_id)
                        if not users:
                            self.thread_subscribers.pop(tid, None)
        logger.info("WS disconnect user=%s remaining_conns=%d", user_id, self._total_count())

    def _total_count(self) -> int:
        return sum(len(s) for s in self.connections.values())

    # ------------------------------------------------------------------
    # Subscriptions (chat threads)
    # ------------------------------------------------------------------
    async def subscribe_thread(self, user_id: UUID, thread_id: UUID) -> None:
        async with self._lock:
            self.thread_subscribers[thread_id].add(user_id)

    async def unsubscribe_thread(self, user_id: UUID, thread_id: UUID) -> None:
        async with self._lock:
            users = self.thread_subscribers.get(thread_id)
            if users:
                users.discard(user_id)
                if not users:
                    self.thread_subscribers.pop(thread_id, None)

    # ------------------------------------------------------------------
    # Sending events
    # ------------------------------------------------------------------
    async def _safe_send(self, ws: WebSocket, event: Dict[str, Any]) -> None:
        try:
            await ws.send_json(event)
        except Exception as e:
            logger.debug("WS send failed (%s) — dropping connection", e)

    async def send_to_user(self, user_id: UUID, event: Dict[str, Any]) -> None:
        sockets = list(self.connections.get(user_id, set()))
        if not sockets:
            return
        await asyncio.gather(*(self._safe_send(ws, event) for ws in sockets), return_exceptions=True)

    async def broadcast_to_admins(self, event: Dict[str, Any]) -> None:
        admin_ids = [uid for uid, is_a in self.is_admin.items() if is_a]
        if not admin_ids:
            return
        await asyncio.gather(*(self.send_to_user(uid, event) for uid in admin_ids), return_exceptions=True)

    async def broadcast_to_thread(self, thread_id: UUID, event: Dict[str, Any]) -> None:
        """Envía a todos los suscritos al hilo (la pestaña abierta del chat)."""
        user_ids = list(self.thread_subscribers.get(thread_id, set()))
        if not user_ids:
            return
        await asyncio.gather(*(self.send_to_user(uid, event) for uid in user_ids), return_exceptions=True)


# Singleton global del proceso
ws_manager = WSManager()
