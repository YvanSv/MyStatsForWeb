from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlmodel import Session
from app.database import get_session
from app.models import User, TrackHistory, Track, Album, Artist
from app.response_message import GlobalStatsResponse
from fastapi_cache.decorator import cache

router = APIRouter()

@router.get("", response_model=GlobalStatsResponse)
@cache(expire=60)
async def get_overview(db: Session = Depends(get_session)):
    """
    Fournit un aperçu volumétrique de la base de données.
    
    **Indicateurs inclus :**
    - **Users** : Nombre total de comptes créés.
    - **Streams** : Nombre total d'écoutes enregistrées (tous utilisateurs confondus).
    - **Tracks/Albums/Artists** : Nombre d'entités uniques indexées en base.

    **Note technique :** Cette route effectue plusieurs comptages (`COUNT`) successifs. Sur une base de données très volumineuse (millions d'écoutes), ces opérations peuvent devenir lourdes.
    """
    user_count = db.exec(select(func.count(User.id))).scalar() or 0
    streams_count = db.exec(select(func.count(TrackHistory.id))).scalar() or 0
    tracks_count = db.exec(select(func.count(Track.spotify_id))).scalar() or 0
    albums_count = db.exec(select(func.count(Album.spotify_id))).scalar() or 0
    artists_count = db.exec(select(func.count(Artist.spotify_id))).scalar() or 0
    
    return {
        "users": user_count,
        "streams": streams_count,
        "tracks": tracks_count,
        "albums": albums_count,
        "artists": artists_count
    }