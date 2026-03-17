from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlmodel import Session
from app.auth.utils.auth_utils import get_current_user_id
from app.database import get_session
from app.models import User
from app.spotify.utils.SpotifyWorker import spotify_worker

router = APIRouter()

@router.get('')
async def refresh(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.id == user_id)).scalars().first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    if not user.spotify_id:
        raise HTTPException(
            status_code=400, 
            detail="Compte Spotify non lié. Impossible de rafraîchir l'historique."
        )

    await spotify_worker.get_history_for(user.id)
    return {"status": "success", "message": "Synchronisation lancée en arrière-plan."}