from datetime import datetime, time
from pydantic import BaseModel
from sqlalchemy import func, select
from app.database import get_session
from app.models import TrackHistory, User
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.auth.utils.auth_utils import get_current_user_id

class TodayStatsResponse(BaseModel):
    nb_streams: int
    nb_minutes: int

router = APIRouter()


@router.get('', response_model=TodayStatsResponse)
async def get_today(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user: 
        raise HTTPException(status_code=401, detail="Session invalide")
    
    # On définit le début et la fin de la journée en objets datetime
    today_start = datetime.combine(datetime.today(), time.min)
    today_end = datetime.combine(datetime.today(), time.max)
    
    # Sélection avec intervalle (optimisé pour les index)
    results = db.exec(
        select(
            func.sum(TrackHistory.ms_played).label("total_ms"),
            func.count(TrackHistory.id).label("total_streams")
        )
        .where(TrackHistory.user_id == user_id)
        .where(TrackHistory.played_at >= today_start)
        .where(TrackHistory.played_at <= today_end)
    ).first()

    # Utilisation de l'accès par nom (si tu utilises .first()) ou par index
    total_ms = results[0] if results and results[0] else 0
    total_streams = results[1] if results and results[1] else 0

    return TodayStatsResponse(
        nb_streams=total_streams,
        nb_minutes=round(total_ms / 60000)
    )