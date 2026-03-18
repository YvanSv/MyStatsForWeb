from datetime import date

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
    user = db.get(User,user_id)
    if not user: raise HTTPException(status_code=401, detail="Session invalide")
    today = date.today()
    results = db.exec(
        select(
            func.sum(TrackHistory.ms_played).label("total_ms"),
            func.count(TrackHistory.id).label("total_streams")
        )
        .where(TrackHistory.user_id == user_id)
        .where(func.date(TrackHistory.played_at) == today)
    ).first()

    return TodayStatsResponse(
        nb_streams=results[1] if results and results[1] else 0,
        nb_minutes=round((results[0] if results and results[0] else 0) / 60000)
    )