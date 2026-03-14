from .utils.metadata import get_date_metadata
from app.database import get_session
from app.models import TrackHistory, Track, Artist, Album
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import Date, Float, cast, func, select, text
from sqlmodel import Session
from app.response_message import AlbumStatsResponse, AlbumMetadataResponse
from fastapi_cache.decorator import cache

router = APIRouter()

@router.get("", response_model=List[AlbumStatsResponse])
@cache(expire=300)
async def get_all_albums(
    *,
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = None,
    album: Optional[str] = None,
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
    Calcule et récupère les statistiques d'écoute par album pour l'utilisateur.

    **Fonctionnalités avancées :**
    - **Calcul d'engagement** : Ratio entre le temps écouté et la durée réelle des pistes.
    - **Score de Rating** : Algorithme personnalisé basé sur l'engagement, le volume d'écoute et la régularité.
    - **Filtrage SQL (HAVING)** : Les filtres de volume (streams/minutes) sont appliqués au niveau de la base de données pour plus de performance.
    - **Filtrage Post-Calcul** : Les filtres de rating sont appliqués après le calcul algorithmique.

    **Algorithme de Rating :**
    Le score est calculé uniquement pour les albums ayant plus de 5 écoutes. Il prend en compte :
    - L'engagement moyen (le fait d'écouter les morceaux jusqu'au bout).
    - Le temps total passé sur l'album.
    - Une pondération par le nombre d'écoutes pour éviter les biais sur les albums courts.
    """
    sum_played = func.sum(TrackHistory.ms_played)
    sum_duration = func.sum(Track.duration_ms)
    engagement_sql = (cast(sum_played, Float) / func.nullif(cast(sum_duration, Float), 0)).label("engagement")
    play_count = func.count(TrackHistory.id).label("play_count")
    total_minutes = (cast(sum_played, Float) / 60000).label("total_minutes")

    query = (
        select(
            Album,
            Artist.name.label("artist_name"),
            play_count,
            total_minutes,
            engagement_sql
        )
        .join(Track, Track.album_id == Album.spotify_id)
        .join(Artist, Album.artist_id == Artist.spotify_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
    if album: query = query.where(Album.name.ilike(f"%{album}%"))
    if date_min: query = query.where(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: query = query.where(cast(TrackHistory.played_at, Date) <= f"{date_max} 23:59:59")
    query = query.group_by(Album.spotify_id, Artist.name)
    having_conditions = []
    if streams_min is not None: having_conditions.append(play_count >= streams_min)
    if streams_max is not None: having_conditions.append(play_count <= streams_max)
    if minutes_min is not None: having_conditions.append(total_minutes >= minutes_min)
    if minutes_max is not None: having_conditions.append(total_minutes <= minutes_max)
    if engagement_min is not None: having_conditions.append(engagement_sql >= engagement_min / 100)
    if engagement_max is not None: having_conditions.append(engagement_sql <= engagement_max / 100)
    if having_conditions: query = query.having(*(having_conditions))
    results = db.exec(query).all()

    final_list = []
    for row in results:
        album_obj, art_name, count, mins, eng = row
        eng = min(eng or 0.0, 1.0)
        if count > 5:
            rating = (eng * mins / (7 * count) + eng*mins / 3200.0) * 1.75 / (1 / eng)
        else: rating = 0

        if rating_min and rating <= rating_min: continue
        if rating_max and rating >= rating_max: continue
        final_list.append({
            "spotify_id": album_obj.spotify_id,
            "name": album_obj.name,
            "artist": art_name,
            "cover": album_obj.image_url,
            "play_count": count,
            "total_minutes": round(mins),
            "engagement": round(eng * 100, 2),
            "rating": round(rating,2) or 0
        })
    if sort in ["name", "play_count", "total_minutes", "engagement", "rating"]:
        final_list.sort(key=lambda x: x[sort], reverse=(direction == "desc"))
    return final_list[offset : offset + limit]

@router.get(
    "/metadata",
    summary="Récupérer les bornes maximales des albums",
    response_model=AlbumMetadataResponse,
    responses={
        200: {
            "description": "Retourne les valeurs maximales pour calibrer les filtres du frontend.",
            "model": AlbumMetadataResponse
        }
    }
)
@cache(expire=300)
async def get_albums_metadata(db: Session = Depends(get_session)):
    """
    Analyse l'ensemble de la bibliothèque pour extraire les records et les périodes d'écoute.
    
    **Utilité :**
    Cette route est conçue pour alimenter les composants de filtrage (sliders) sur le Frontend. 
    Elle calcule dynamiquement :
    - Le record de streams sur un seul album.
    - Le record de temps passé sur un seul album.
    - Le score de rating le plus élevé atteint.
    - La plage de dates disponible dans l'historique.

    **Logique de calcul :**
    - Effectue une agrégation SQL (SUM/COUNT) groupée par album.
    - Calcule le rating de l'album 'leader' en utilisant la même formule que la route principale.
    - En cas de base de données vide, renvoie des valeurs par défaut sécurisées pour éviter les crashs d'UI.
    """
    # On récupère les stats de l'album recordman
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms"),
            func.sum(Track.duration_ms).label("total_duration")
        )
        .select_from(TrackHistory)
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .join(Album, Album.spotify_id == Track.album_id)
        .group_by(Album.spotify_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    date_min, date_max = get_date_metadata(db)
    if not stats: return {"max_streams": 100, "max_minutes": 100, "max_rating": 10, "date_min": date_min, "date_max": date_max}

    count = stats[0]
    mins = (stats[1] or 0) / 60000
    total_duration = stats[2] or 0
    eng = (stats[1] / total_duration) if total_duration > 0 else 0
    eng = min(eng, 1.0)
    if count > 5: max_rating = (eng * mins / (7 * count) + eng*mins / 3200.0) * 1.75 / (1 / eng)
    else: max_rating = 0

    return {
        "max_streams": count,
        "max_minutes": round(mins),
        "max_rating": max(round(max_rating,2)+0.05, 0),
        "date_min": date_min,
        "date_max": date_max
    }