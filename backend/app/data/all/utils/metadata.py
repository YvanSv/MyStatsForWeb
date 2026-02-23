import datetime
from fastapi import Depends
from sqlalchemy import func, select
from sqlmodel import Session
from app.database import get_session
from app.models import TrackHistory

def get_date_metadata(db: Session = Depends(get_session)):
    # Bornes temporelles basées sur l'HISTORIQUE d'écoute (played_at)
    # On récupère le tout premier et le tout dernier stream
    history_dates = db.exec(
        select(
            func.min(TrackHistory.played_at).label("first_listen"),
            func.max(TrackHistory.played_at).label("last_listen")
        )
    ).first()

    if not history_dates: return {"date_min": "1890-01-01", "date-max": datetime.datetime.now().strftime("%Y-%m-%d")}

    # Formatage des dates pour l'input HTML (YYYY-MM-DD)
    d_min = history_dates[0].strftime("%Y-%m-%d") if history_dates and history_dates[0] else "2020-01-01"
    d_max = history_dates[1].strftime("%Y-%m-%d") if history_dates and history_dates[1] else datetime.datetime.now().strftime("%Y-%m-%d")
    return {"date_min": d_min, "date_max": d_max}