"""
[CONTEXT: REALTIME] - WebSocket endpoint
SC-WS-01: Single endpoint /ws con auth via query string ?token=<JWT>.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_user_from_ws_token
from services.ws_manager import ws_manager

router = APIRouter()
logger = logging.getLogger("cjdg.ws")


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT del usuario"),
    db: Session = Depends(get_db),
):
    """
    Conexión WebSocket persistente por usuario. Multi-tab soportado.
    El cliente debe enviar acciones como JSON:
      - {"action": "ping"}
      - {"action": "subscribe_thread", "thread_id": "<uuid>"}
      - {"action": "unsubscribe_thread", "thread_id": "<uuid>"}
    """
    user = get_user_from_ws_token(token, db)
    if not user:
        await websocket.close(code=1008, reason="Invalid token")
        return

    is_admin = user.role.value.lower() == "admin"
    await ws_manager.connect(websocket, user.id, is_admin)

    try:
        # Saludo inicial — útil para que el frontend confirme conexión
        await websocket.send_json({"type": "connected", "user_id": str(user.id)})

        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "ping":
                await websocket.send_json({"type": "pong"})

            elif action == "subscribe_thread":
                tid_str = data.get("thread_id")
                if tid_str:
                    try:
                        await ws_manager.subscribe_thread(user.id, UUID(tid_str))
                    except ValueError:
                        pass

            elif action == "unsubscribe_thread":
                tid_str = data.get("thread_id")
                if tid_str:
                    try:
                        await ws_manager.unsubscribe_thread(user.id, UUID(tid_str))
                    except ValueError:
                        pass
            # Otras acciones se ignoran silenciosamente

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, user.id)
    except Exception as e:
        logger.warning("WS error user=%s: %s", user.id, e)
        await ws_manager.disconnect(websocket, user.id)
