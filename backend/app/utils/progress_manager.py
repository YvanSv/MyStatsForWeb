from typing import Dict
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlmodel import Session, select
from app.database import engine
from app.models import User
from .cors import ALLOWED_ORIGINS

# Dictionnaire simple en mémoire : { user_id: percentage }
_progress_store: Dict[int, int] = {}

def set_progress(user_id: int, value: int):
    _progress_store[user_id] = value

def get_progress(user_id: int) -> int:
    return _progress_store.get(user_id, 0)

router = APIRouter()

@router.websocket("/ws/progress/{user_id}")
async def websocket_progress(websocket: WebSocket, user_id: int):
    # Le navigateur envoie le cookie de session au WebSocket : seul le propriétaire suit sa progression
    origin = websocket.headers.get("origin")
    if origin is not None and origin not in ALLOWED_ORIGINS:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    session_id = websocket.cookies.get("session_id")
    owner_id = None
    if session_id:
        # Session courte : la connexion à la base n'est pas gardée pendant toute la durée du WebSocket
        with Session(engine) as db:
            owner_id = db.exec(select(User.id).where(User.session_id == session_id)).first()
    if owner_id is None or owner_id != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    last_sent = -1
    try:
        while True:
            current_progress = get_progress(user_id)
            if current_progress != last_sent:
                await websocket.send_json({"percentage": current_progress})
                last_sent = current_progress
            
            if current_progress >= 100:
                # On attend un peu avant de fermer pour que le front voit le 100%
                await asyncio.sleep(2)
                break   
            
            await asyncio.sleep(0.5)
    except WebSocketDisconnect: pass