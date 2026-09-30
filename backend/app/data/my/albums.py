from app.database import get_session
from app.models import TrackHistory, Artist, Album
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import Date, cast
from sqlmodel import Session
from app.response_message import AlbumStatsResponse, AlbumMetadataResponse
from app.auth.utils.auth_utils import get_current_user_id
from .utils.metadata import get_entity_stats, get_generic_metadata
from app.utils.rating import get_formulas

router = APIRouter()

@router.get("", response_model=List[AlbumStatsResponse])
async def get_user_albums(
    *,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = "",
    album: Optional[str] = "",
    streams_min: Optional[int] = 0,
    streams_max: Optional[int] = None,
    minutes_min: Optional[float] = 0,
    minutes_max: Optional[float] = None,
    rating_min: Optional[float] = 0,
    rating_max: Optional[float] = None,
    engagement_min: Optional[float] = 0,
    engagement_max: Optional[float] = 100,
    date_min: Optional[str] = None,
    date_max: Optional[str] = None,
):
    # Récupération de la formule globale centralisée
    _, f_album, _ = get_formulas()
    
    # Clauses WHERE spécifiques
    search_filters = []
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if album: search_filters.append(Album.name.ilike(f"%{album}%"))
    if date_min: search_filters.append(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: search_filters.append(cast(TrackHistory.played_at, Date) <= date_max)

    results = get_entity_stats(db, user_id, Album, Album.id, f_album, locals(), search_filters)

    # Formatage final propre
    return [{
        "id": r[0].id,
        "name": r[0].name,
        "artist": r[0].artist.name,
        "cover": r[0].image_url,
        "play_count": r.play_count,
        "total_minutes": r.total_minutes,
        "engagement": r.engagement,
        "rating": r.rating
    } for r in results]

@router.get('/metadata', response_model=AlbumMetadataResponse)
async def get_user_albums_metadata(db: Session = Depends(get_session),user_id: int = Depends(get_current_user_id)):
    """
    Calcule les limites supérieures pour les filtres de recherche d'albums.
    
    **Logique interne :**
    1. **Isolation** : Filtre uniquement les écoutes liées à l'utilisateur courant via son `session_id`.
    2. **Agrégation par Album** : Utilise une sous-requête pour regrouper les écoutes par album et calculer les scores (streams, minutes, rating).
    3. **Analyse Globale** : Extrait les valeurs `MAX()` de cette sous-requête et les dates `MIN/MAX` de l'historique complet.
    
    **Valeurs par défaut :**
    Si l'utilisateur n'a aucune donnée, les dates sont fixées par défaut (1890-01-01 à [date du jour]) pour éviter les plantages du sélecteur de date.
    """
    _, f_album, _ = get_formulas()
    return get_generic_metadata(db, user_id, Album.id, f_album)