from fastapi import APIRouter, Depends
from sqlalchemy import cast, Date
from sqlmodel import Session
from typing import Optional, List
from app.database import get_session
from app.models import Artist, Track, TrackHistory
from app.response_message import ArtistStatsResponse, ArtistMetadataResponse
from app.auth.utils.auth_utils import get_current_user_id
from .utils.metadata import get_entity_stats, get_generic_metadata
from app.utils.rating import get_formulas

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
    rating_max: Optional[float] = 100,
    engagement_min: Optional[float] = None,
    engagement_max: Optional[float] = 100,
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
    _, _, f_artist = get_formulas()

    # Clauses de filtrage textuel et temporel
    search_filters = []
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if date_min: search_filters.append(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: search_filters.append(cast(TrackHistory.played_at, Date) <= date_max)

    # Appel du moteur d'agrégation
    # Note : On groupe par Artist.id (Integer PK) pour la performance maximale
    results = get_entity_stats(
        db=db,
        user_id=user_id,
        base_model=Artist,
        group_col=Artist.id,
        rating_formula=f_artist,
        filters=locals(),
        search_filters=search_filters
    )

    # Formatage du retour JSON
    return [{
        "id": r[0].id,
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