from app.database import get_session
from app.models import TrackHistory, Track, Artist, Album
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import Date, Float, cast, func
from sqlmodel import Session
from app.response_message import AlbumStatsResponse, AlbumMetadataResponse
from app.auth.utils.auth_utils import get_current_user_id
from .utils.metadata import get_entity_stats, get_formulas, get_generic_metadata

router = APIRouter()

@router.get("",response_model=List[AlbumStatsResponse])
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
    """
    Récupère les albums de l'utilisateur avec calcul de score en temps réel.
    
    **Optimisations SQL :**
    - **Calculs Natifs** : Le rating et l'engagement sont calculés via des fonctions SQL (`CASE`, `CAST`, `SUM`).
    - **Filtrage HAVING** : Les bornes (min/max) sont appliquées sur les agrégats avant le retour des données.
    - **Tri Hiérarchique** : En cas d'égalité sur le critère principal, un tri secondaire (ex: minutes ou ID) est appliqué pour une pagination stable.
    - **Sécurité** : Filtrage automatique par `current_user_id` extrait de la session.
    """
    # 1. Définition de la formule de rating spécifique Album
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_dur = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    
    f_album = ((raw_ms/raw_dur) * (raw_ms/60000.0) / (7.0 * func.nullif(cnt, 0)) + ((raw_ms/raw_dur) * (raw_ms/60000.0) / 3200.0)) * 1.75 * (raw_ms/raw_dur)

    # 2. Clauses WHERE spécifiques
    search_filters = []
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if album: search_filters.append(Album.name.ilike(f"%{album}%"))
    if date_min: search_filters.append(cast(TrackHistory.played_at, Date) >= date_min)

    # 3. Appel du moteur
    results = get_entity_stats(db, user_id, Album, Album.spotify_id, f_album, locals(), search_filters)

    # 4. Formatage final
    return [{
        "spotify_id": r[0].spotify_id,
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
    return get_generic_metadata(db, user_id, Track.album_id, f_album)