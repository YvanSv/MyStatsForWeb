from typing import Dict
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

# Dictionnaire simple en mémoire : { user_id: percentage }
_progress_store: Dict[int, int] = {}

def set_progress(user_id: int, value: int):
    _progress_store[user_id] = value

def get_progress(user_id: int) -> int:
    return _progress_store.get(user_id, 0)

router = APIRouter()

@router.websocket("/ws/progress/{user_id}")
async def websocket_progress(websocket: WebSocket, user_id: int):
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