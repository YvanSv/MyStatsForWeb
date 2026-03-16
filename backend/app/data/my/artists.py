from fastapi import APIRouter, Depends, Cookie
from sqlalchemy import Float, cast
from sqlmodel import Session, func
from typing import Optional, List
from app.database import get_session
from app.models import Artist, Track, TrackHistory
from app.response_message import ArtistStatsResponse, ArtistMetadataResponse
from app.auth.utils.auth_utils import get_current_user_id
from .utils.metadata import get_entity_stats, get_formulas, get_generic_metadata

router = APIRouter()

@router.get("",response_model=List[ArtistStatsResponse])
async def get_artists(
    *,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = None,
    streams_min: Optional[int] = None,
    streams_max: Optional[int] = None,
    minutes_min: Optional[float] = None,
    minutes_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    engagement_min: Optional[float] = None,
    engagement_max: Optional[float] = None,
    date_min: Optional[str] = None,
    date_max: Optional[str] = None,
):
    """
    Génère le classement des artistes écoutés par l'utilisateur via une agrégation SQL complexe.

    **Logique de calcul intégrée (SQL) :**
    - **Engagement** : Ratio temps écouté / durée totale des pistes de l'artiste (en %).
    - **Rating Artiste** : Formule logarithmique pondérée par l'engagement et le volume. 
      - Utilise `func.log()` pour lisser l'impact des minutes d'écoute.
      - Utilise `func.greatest()` pour éviter les erreurs mathématiques sur les valeurs nulles.
    - **Tri Hiérarchique** : Système de "tie-breaker" (si les écoutes sont égales, on trie par minutes, puis par ID) pour une pagination stable.

    **Sécurité et Performance :**
    - Filtrage par `user_id` obligatoire.
    - Pagination exécutée côté base de données (`offset`, `limit`).
    """
    # 1. Définition de la formule de rating spécifique ARTISTE
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_dur = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    
    m = raw_ms / 60000.0
    e = raw_ms / raw_dur
    
    # Formule logarithmique : on utilise func.log() et func.greatest() pour éviter log(0)
    f_artist = (
        ((e / (7.0 * func.nullif(cnt, 0))) + (func.log(func.greatest(m, 0.001)) / 25.0)) 
        * 4.0 + (cnt * e / 10000.0)
    )

    # 2. Clauses WHERE (Filtre sur le nom de l'artiste et les dates)
    search_filters = []
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if date_min: search_filters.append(TrackHistory.played_at >= date_min)
    if date_max: search_filters.append(TrackHistory.played_at <= f"{date_max} 23:59:59")

    # 3. Appel du moteur générique
    # Ici, le base_model est Artist et on groupe par Artist.spotify_id
    results = get_entity_stats(
        db=db,
        user_id=user_id,
        base_model=Artist,
        group_col=Artist.spotify_id,
        rating_formula=f_artist,
        filters=locals(),
        search_filters=search_filters
    )

    return [{
        "id": r[0].spotify_id,
        "name": r[0].name,
        "image_url": r[0].image_url,
        "play_count": r.play_count,
        "total_minutes": r.total_minutes or 0,
        "engagement": min(r.engagement or 0, 100),
        "rating": r.rating or 0
    } for r in results]

@router.get('/metadata', response_model=ArtistMetadataResponse)
async def get_artists_meta(db: Session = Depends(get_session), u_id: int = Depends(get_current_user_id)):
    _, _, f_artist = get_formulas()
    return get_generic_metadata(db, u_id, Track.artist_id, f_artist)