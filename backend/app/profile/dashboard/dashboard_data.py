from datetime import datetime, date
from typing import Literal, Optional, List, Dict
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query
import sqlalchemy
from sqlmodel import Session, col, select, func, desc, distinct, cast, Float, extract
from app.database import get_session
from app.models import TrackHistory, Track, Album, Artist, User
from app.utils.user_lookup import get_user_by_slug_or_404

router = APIRouter()

@router.get("/{slug}",
    summary="Récupérer l'analyse complète d'un profil",
    responses={
        200: {"description": "Calcul complet des statistiques et graphiques"},
        403: {"description": "Dashboard privé"},
        404: {"description": "Utilisateur non trouvé"}
    }
)
async def get_dashboard_data(
    slug: str, 
    start_date: Optional[datetime] = Query(None), 
    end_date: Optional[datetime] = Query(None),
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    # 1. Auth & Initialisation des filtres
    target_user, is_owner = get_target_user_and_check_perms(slug, session_id, session)
    
    filters = [TrackHistory.user_id == target_user.id]
    if start_date: filters.append(TrackHistory.played_at >= start_date)
    if end_date: filters.append(TrackHistory.played_at <= end_date)

    # 2. Collecte des données (Services optimisés précédemment)
    res = fetch_global_stats(session, filters)

    clock, weekly, monthly, day_map, annual_dict = process_temporal_data(session, filters)

    # 3. Calcul des Peaks (Pics d'activité)
    def get_peak_label(dataset, labels, key="value"):
        if not dataset or not any(d[key] > 0 for d in dataset):
            return ["N/A", "N/A"]
        # On trouve l'index de la valeur max pour les minutes (value) et les streams
        idx_min = max(range(len(dataset)), key=lambda i: dataset[i]["value"])
        idx_str = max(range(len(dataset)), key=lambda i: dataset[i]["streams"])
        return [labels[idx_min], labels[idx_str]]

    days_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    months_names = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    hours_labels = [f"{i}h" for i in range(24)]

    # 4. Finalisation de CumulativeData (Running total pour le graph)
    cumulative_data = []
    running_ms, running_streams = 0, 0
    for d_str in sorted(day_map.keys()):
        day_info = day_map[d_str]
        running_ms += day_info["ms"]
        running_streams += day_info["streams"]
        cumulative_data.append({
            "date": d_str,
            "minutes": round(running_ms / 60000, 1),
            "streams": running_streams
        })

    # 5. Construction de la réponse finale
    return {
        "totalTime": (res.total_ms // 60000),
        "totalStreams": res.total_streams,
        "uniqueTracks": res.unique_tracks,
        "uniqueAlbums": res.unique_albums,
        "uniqueArtists": res.unique_artists,
        
        # Peaks
        "peakHour": get_peak_label(clock, hours_labels),
        "peakDay": get_peak_label(weekly, days_names),
        "peakMonth": get_peak_label(monthly, months_names),
        
        # Intensité
        "avgTimePerDay": (res.total_ms // 60000) // (res.days_count or 1),
        "avgStreamsPerDay": round(res.total_streams / (res.days_count or 1), 1),
        "ratio": min(round(res.completion or 0, 1), 100.0),
        
        # Datasets pour graphiques
        "clockData": clock,
        "weeklyData": weekly,
        "monthlyData": monthly,
        "annualData": sorted(annual_dict.values(), key=lambda x: x['year']),
        "cumulativeData": cumulative_data,
        
        # Tops (Dualité ms / count incluse dans get_top_item)
        "topTrack": get_top_item(session, filters, 'track'),
        "topAlbum": get_top_item(session, filters, 'album'),
        "topArtist": get_top_item(session, filters, 'artist'),
        
        # Évolutions
        "entityEvolution": fetch_discovery_evolution(session, target_user.id, filters),
        "streamsEvolution": await get_streams_evolution(target_user.id, start_date, end_date, session)
    }

def get_target_user_and_check_perms(slug: str, session_id: Optional[str], session: Session):
    # 1. Récupération de l'utilisateur cible (Target)
    target_user = get_user_by_slug_or_404(session, slug, detail="Utilisateur non trouvé")

    # 2. Identification du visiteur
    visitor = None
    if session_id: visitor = session.exec(select(User).where(User.session_id == session_id)).first()
    
    # 3. Logique de Permission
    is_owner = visitor is not None and visitor.id == target_user.id
    
    # Le dashboard n'est public que si le profil ET le dashboard le sont
    # .get() permet de définir une valeur par défaut si la clé n'existe pas
    has_public_access = target_user.perms.get("profile", True) and target_user.perms.get("dashboard", True)
    
    if not is_owner and not has_public_access: raise HTTPException(status_code=403, detail="Ce dashboard est privé")
        
    return target_user, is_owner

def fetch_global_stats(session, filters):
    """
    Calcule les statistiques globales (KPIs) pour un utilisateur.
    """
    return session.exec(
        select(
            # Somme du temps et nombre total de streams
            func.coalesce(func.sum(TrackHistory.ms_played), 0).label("total_ms"),
            func.count(TrackHistory.id).label("total_streams"),
            
            # Diversité du catalogue (basée sur les IDs de ton modèle)
            func.count(distinct(TrackHistory.track_id)).label("unique_tracks"),
            func.count(distinct(TrackHistory.album_id)).label("unique_albums"),
            func.count(distinct(TrackHistory.artist_id)).label("unique_artists"),
            
            # Nombre de jours d'activité
            func.count(distinct(func.date(TrackHistory.played_at))).label("days_count"),
            
            # Taux de complétion moyen (nécessite la jointure avec Track pour la durée théorique)
            # On multiplie par 1.0 pour forcer le passage en Float (important pour SQLite)
            func.avg(
                (cast(TrackHistory.ms_played, Float) / func.nullif(cast(Track.duration_ms, Float), 0)) * 100
            ).label("completion")
        )
        # Jointure uniquement nécessaire pour récupérer Track.duration_ms
        # (le nullif évite les divisions par zéro, les durées inconnues sont ignorées par avg)
        .join(Track, Track.id == TrackHistory.track_id)
        .where(*filters)
    ).first()

def process_temporal_data(session, filters):
    # 1. Requête SQL groupée par Date et Heure
    # Note : 'hour' extrait directement l'heure 0-23
    raw_time_data = session.exec(
        select(
            func.date(TrackHistory.played_at).label("date"),
            extract('hour', TrackHistory.played_at).label("hour"),
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters)
        .group_by("date", "hour")
        .order_by("date")
    ).all()

    # 2. Initialisation des structures de données
    clock = [{"hour": f"{i}h", "value": 0, "streams": 0} for i in range(24)]
    weekly = [{"day": d, "value": 0, "streams": 0} for d in ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]]
    monthly = [{"month": m, "value": 0, "streams": 0} for m in ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]]
    
    current_day_map = {}
    annual_dict = {}

    for r in raw_time_data:
        # Conversion de r.date (qui peut être une string ou un objet date selon le driver)
        dt_obj = r.date if isinstance(r.date, (datetime, date)) else datetime.strptime(str(r.date), '%Y-%m-%d').date()
        
        # Indices pour les listes (0-indexed)
        h_int = int(r.hour)
        # ISO week day : Lun=0, Dim=6
        d_idx = dt_obj.weekday() 
        # Mois : Jan=0, Déc=11
        m_idx = dt_obj.month - 1
        
        mins = round(r.ms / 60000)
        
        # Remplissage Horloge
        clock[h_int]["value"] += mins
        clock[h_int]["streams"] += r.streams
        
        # Remplissage Hebdomadaire
        weekly[d_idx]["value"] += mins
        weekly[d_idx]["streams"] += r.streams
        
        # Remplissage Mensuel
        monthly[m_idx]["value"] += mins
        monthly[m_idx]["streams"] += r.streams

        # Cumul par jour (pour heatmap ou graphiques d'évolution)
        day_str = dt_obj.isoformat()
        if day_str not in current_day_map: current_day_map[day_str] = {"ms": 0, "streams": 0, "obj": dt_obj}
        current_day_map[day_str]["ms"] += r.ms
        current_day_map[day_str]["streams"] += r.streams

        # Annuel
        year = dt_obj.year
        if year not in annual_dict: annual_dict[year] = {"year": str(year), "value": 0, "streams": 0}
        annual_dict[year]["value"] += mins
        annual_dict[year]["streams"] += r.streams

    return clock, weekly, monthly, current_day_map, annual_dict

def fetch_discovery_evolution(session, user_id: int, filters: list) -> List[Dict]:
    """
    Calcule l'évolution du catalogue : compte quand chaque entité 
    (musique, album, artiste) a été écoutée pour la toute première fois.
    """
    def get_discovery_query(id_col):
        # 1. Sous-requête : Trouve la date de PREMIÈRE écoute (fs = first sight) pour chaque ID unique
        # On utilise directement les colonnes présentes dans TrackHistory (plus rapide)
        subq = (
            select(
                id_col.label("id"), 
                func.min(TrackHistory.played_at).label("fs")
            )
            .where(TrackHistory.user_id == user_id, *filters)
            .group_by(id_col)
            .subquery()
        )
        
        # 2. Requête principale : Compte combien d'IDs uniques apparaissent pour la première fois par jour
        return session.exec(
            select(
                func.date(subq.c.fs).label("d"), 
                func.count(subq.c.id).label("c")
            )
            .group_by("d")
            .order_by("d")
        ).all()

    # --- ÉTAPE 1 : Récupération des données brutes ---
    daily_tracks = get_discovery_query(TrackHistory.track_id)
    daily_albums = get_discovery_query(TrackHistory.album_id)
    daily_artists = get_discovery_query(TrackHistory.artist_id)

    # --- ÉTAPE 2 : Création de l'axe temporel ---
    all_dates = sorted(list(set(
        [r.d for r in daily_tracks if r.d] + 
        [r.d for r in daily_albums if r.d] + 
        [r.d for r in daily_artists if r.d]
    )))

    if not all_dates: return []

    # --- ÉTAPE 3 : Initialisation du dictionnaire de travail ---
    entity_evolution = {
        d.isoformat() if isinstance(d, (date)) else str(d): {
            "date": d.isoformat() if isinstance(d, (date)) else str(d), 
            "tracks": 0, "albums": 0, "artists": 0
        } for d in all_dates
    }

    # --- ÉTAPE 4 : Remplissage avec les découvertes quotidiennes ---
    for r in daily_tracks:
        if r.d: entity_evolution[str(r.d)]["tracks"] = r.c
    for r in daily_albums:
        if r.d: entity_evolution[str(r.d)]["albums"] = r.c
    for r in daily_artists:
        if r.d: entity_evolution[str(r.d)]["artists"] = r.c

    # --- ÉTAPE 5 : Calcul du cumulatif (Running Total) ---
    discovery_sorted_list = []
    current_t, current_al, current_ar = 0, 0, 0

    for d_str in sorted(entity_evolution.keys()):
        day_data = entity_evolution[d_str]
        
        current_t += day_data["tracks"]
        current_al += day_data["albums"]
        current_ar += day_data["artists"]
        
        discovery_sorted_list.append({
            "date": d_str,
            "tracks": current_t,
            "albums": current_al,
            "artists": current_ar
        })

    return discovery_sorted_list

def get_top_item(session: Session, filters: list, target: Literal['track', 'album', 'artist']):
    def get_top_stat(target_type: str, metric: Literal['ms', 'count']):
        agg_col = func.sum(TrackHistory.ms_played) if metric == 'ms' else func.count(TrackHistory.id)
        label = "total_ms" if metric == 'ms' else "total_count"
        
        group_id_col = {
            'track': TrackHistory.track_id, 
            'album': TrackHistory.album_id, 
            'artist': TrackHistory.artist_id
        }[target_type]

        subq = (
            select(group_id_col.label("sid"), agg_col.label(label))
            .where(*filters)
            .group_by(group_id_col)
            .order_by(desc(label))
            .limit(1)
            .subquery()
        )

        if target_type == 'track':
            columns = [Track.title, Artist.name.label("artist_name"), Album.name.label("album_name"), Album.image_url]
            stmt = select(*columns, getattr(subq.c, label)).join(Track, Track.id == subq.c.sid)
            stmt = stmt.join(Album, Track.album_id == Album.id)
            stmt = stmt.join(Artist, Track.artist_id == Artist.id)
            
        elif target_type == 'album':
            columns = [Album.name.label("album_name"), Artist.name.label("artist_name"), Album.image_url]
            stmt = select(*columns, getattr(subq.c, label)).join(Album, Album.id == subq.c.sid)
            stmt = stmt.join(Artist, Album.artist_id == Artist.id)
            
        else: # artist
            columns = [Artist.name.label("artist_name"), Artist.image_url]
            stmt = select(*columns, getattr(subq.c, label)).join(Artist, Artist.id == subq.c.sid)

        return session.exec(stmt).first()

    def format_item(res, type_item: str):
        if not res: return None
        return {
            "name": res.title if type_item == 'track' else (res.album_name if type_item == 'album' else res.artist_name),
            "artist": res.artist_name if type_item != 'artist' else None,
            "album": res.album_name if type_item == 'track' else None,
            "image": res.image_url,
            "stat": getattr(res, "total_ms", 0) or getattr(res, "total_count", 0)
        }

    return [
        format_item(get_top_stat(target, 'ms'), target),
        format_item(get_top_stat(target, 'count'), target)
    ]

async def get_streams_evolution(
    user_id: int, 
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    session: Session = Depends(get_session)
):
    filters = [TrackHistory.user_id == user_id]
    if start_date: filters.append(TrackHistory.played_at >= start_date)
    if end_date: filters.append(TrackHistory.played_at <= end_date)
    
    day_col = func.date(TrackHistory.played_at).label("day")
    streams_count = func.count(TrackHistory.id).label("streams")
    total_ms = func.sum(TrackHistory.ms_played).label("ms")

    statement = (
        select(day_col, streams_count, total_ms)
        .where(*filters)
        .group_by(day_col)
        .order_by(day_col)
    )
    
    results = session.exec(statement).all()

    return [{
            "date": str(r.day),
            "streams": r.streams, 
            "minutes": round((r.ms or 0) / 60000, 1) 
        } for r in results
    ]