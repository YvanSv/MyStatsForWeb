from datetime import datetime
from typing import Literal, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query
import sqlalchemy
from sqlmodel import Session, col, select, func, desc
from app.database import get_session
from app.models import TrackHistory, Track, Album, Artist, User

router = APIRouter()

@router.get(
    "/{slug}",
    summary="Récupérer l'analyse complète d'un profil",
    responses={
        200: {"description": "Calcul complet des statistiques et graphiques"},
        403: {"description": "Dashboard privé"},
        404: {"description": "Utilisateur non trouvé"}
    }
)
def get_dashboard_data(
    slug: str, 
    start_date: Optional[datetime] = Query(None), 
    end_date: Optional[datetime] = Query(None),
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    """
    Génère une vue analytique profonde du comportement d'écoute.

    **Fonctionnalités Clés :**
    - **Contrôle d'Accès** : Gère la visibilité publique/privée via les `perms` de l'utilisateur.
    - **Normalisation Temporelle** : Ajustement automatique (Timezone +1h) pour le graphique de l'horloge.
    - **Analyse de Découverte** : Calcule l'évolution du catalogue (quand un artiste/album a été vu pour la première fois).
    - **Dualité des Tops** : Retourne les favoris selon deux métriques : le temps passé (`ms_played`) et la fréquence (`count`).

    **Indicateurs de Performance :**
    - **Ratio de complétion** : Pourcentage moyen d'écoute des morceaux (écoute intégrale vs zapping).
    - **Intensité** : Moyennes quotidiennes de temps et de streams.
    """
    # Récupérer le propriétaire du profil
    if slug.isdigit(): target_user = session.get(User, int(slug))
    else: target_user = session.exec(select(User).where(User.slug == slug)).first()
    if not target_user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # Identifier le visiteur via le cookie
    visitor = None
    if session_id: visitor = session.exec(select(User).where(User.session_id == session_id)).first()
    is_owner = visitor is not None and visitor.id == target_user.id
    # Vérification de la permission Dashboard
    if not is_owner and not target_user.perms.get("dashboard", True): raise HTTPException(status_code=403, detail="Ce dashboard est privé")

    # 0. Filtres communs
    filters = [TrackHistory.user_id == target_user.id]
    if start_date: filters.append(TrackHistory.played_at >= start_date)
    if end_date: filters.append(TrackHistory.played_at <= end_date)

    # 1. Stats Globales
    res = session.exec(
        select(
            func.coalesce(func.sum(TrackHistory.ms_played), 0).label("total_ms"),
            func.count(TrackHistory.id).label("total_streams"),
            func.count(func.distinct(TrackHistory.spotify_id)).label("unique_tracks"),
            func.count(func.distinct(Track.album_id)).label("unique_albums"),
            func.count(func.distinct(Track.artist_id)).label("unique_artists"),
            func.count(func.distinct(func.date(TrackHistory.played_at))).label("days_count"),
            func.avg((col(TrackHistory.ms_played) * 1.0 / col(Track.duration_ms)) * 100).label("completion")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .where(*filters)
        .where(Track.duration_ms > 0)
    ).first()

    # --- 1. Requête unique pour tous les graphiques temporels ---
    # On récupère la donnée brute par JOUR et par HEURE
    raw_time_data = session.exec(
        select(
            func.date(TrackHistory.played_at).label("date"),
            func.extract('hour', TrackHistory.played_at + func.cast('1 hours', sqlalchemy.Interval)).label("hour"),
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters)
        .group_by("date", "hour")
        .order_by("date")
    ).all()

    # --- 2. Agrégation Python (Zéro appel DB supplémentaire) ---
    clock_data = [{"hour": f"{i}h", "value": 0, "streams": 0} for i in range(24)]
    weekly_data = [{"day": d, "value": 0, "streams": 0} for d in ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]]
    monthly_data = [{"month": m, "value": 0, "streams": 0} for m in ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]]
    days_names = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    months_names = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    cumulative_data = []

    running_ms, running_streams = 0, 0
    current_day_data = {}
    annual_dict = {}

    for r in raw_time_data:
        ms, streams = r.ms, r.streams
        h_int = int(r.hour)
        d_idx = (int(r.date.strftime("%w")) + 6) % 7
        m_idx = r.date.month
        
        # Clock
        clock_data[h_int]["value"] += round(ms / 60000)
        clock_data[h_int]["streams"] += streams
        
        # Weekly
        weekly_data[d_idx]["value"] += round(ms / 60000)
        weekly_data[d_idx]["streams"] += streams
        
        # Monthly
        monthly_data[m_idx]["value"] += round(ms / 60000)
        monthly_data[m_idx]["streams"] += streams
        
        # Cumulative (on groupe par date car raw_time_data a plusieurs entrées par jour via l'heure)
        day_str = r.date.isoformat()
        if day_str not in current_day_data:
            current_day_data[day_str] = {"ms": 0, "streams": 0, "obj": r.date}
        current_day_data[day_str]["ms"] += ms
        current_day_data[day_str]["streams"] += streams

        year = r.date.year
        if year not in annual_dict:
            annual_dict[year] = {"year": str(year), "value": 0, "streams": 0}
        annual_dict[year]["value"] += round(r.ms / 60000)
        annual_dict[year]["streams"] += r.streams

    years_present = sorted(annual_dict.keys())
    annual_data = []

    if years_present:
        for y in range(min(years_present), max(years_present) + 1):
            if y in annual_dict:
                annual_data.append(annual_dict[y])
            else:
                # Année vide pour la continuité du graphique
                annual_data.append({"year": str(y), "value": 0, "streams": 0})

    # Finalisation du cumulé
    for d_str in sorted(current_day_data.keys()):
        d = current_day_data[d_str]
        running_ms += d["ms"]
        running_streams += d["streams"]
        cumulative_data.append({
            "full_date": d_str,
            "display_date": d["obj"].strftime("%d/%m/%y"),
            "minutes": round(running_ms / 60000, 1),
            "streams": running_streams
        })
    
    peak_h_val = max(range(24), key=lambda h: clock_data[h]["value"]) if any(h["value"] > 0 for h in clock_data) else None
    peak_d_idx = max(range(7), key=lambda d: weekly_data[d]["value"]) if any(d["value"] > 0 for d in weekly_data) else None
    peak_m_idx = max(range(12), key=lambda m: monthly_data[m]["value"]) if any(m["value"] > 0 for m in monthly_data) else None
    peak_m_name = months_names[peak_m_idx - 1] if peak_m_idx is not None else "--"
    
    # --- 3. Factorisation des Découvertes (Discovery) ---
    def get_discovery(id_col, join_track=False):
        stmt = select(id_col.label("id"), func.min(TrackHistory.played_at).label("fs"))
        if join_track:
            stmt = stmt.join(Track, Track.spotify_id == TrackHistory.spotify_id)
        
        subq = stmt.where(TrackHistory.user_id == target_user.id, *filters).group_by(id_col).subquery()
        
        return session.exec(
            select(func.date(subq.c.fs).label("d"), func.count(subq.c.id).label("c"))
            .group_by("d").order_by("d")
        ).all()

    daily_tracks = get_discovery(TrackHistory.spotify_id)
    daily_albums = get_discovery(Track.album_id, join_track=True)
    daily_artists = get_discovery(Track.artist_id, join_track=True)

    all_dates = sorted(list(set(
        [r.d for r in daily_tracks] + 
        [r.d for r in daily_albums] + 
        [r.d for r in daily_artists]
    )))

    entity_evolution = {d.isoformat(): {"date": d.isoformat(), "tracks": 0, "albums": 0, "artists": 0} for d in all_dates}
    for r in daily_tracks: entity_evolution[r.d.isoformat()]["tracks"] = r.c
    for r in daily_albums: entity_evolution[r.d.isoformat()]["albums"] = r.c
    for r in daily_artists: entity_evolution[r.d.isoformat()]["artists"] = r.c

    evolution_sorted = []
    last_t, last_al, last_ar = 0, 0, 0

    for d_str in sorted(entity_evolution.keys()):
        entry = entity_evolution[d_str]
        
        # On ajoute la valeur du jour au cumul précédent
        last_t += entry["tracks"]
        last_al += entry["albums"]
        last_ar += entry["artists"]
        
        evolution_sorted.append({
            "date": d_str,
            "tracks": last_t,
            "albums": last_al,
            "artists": last_ar
        })

    return {
        "totalTime": (res.total_ms // 60000),
        "totalStreams": res.total_streams,
        "uniqueTracks": res.unique_tracks,
        "uniqueAlbums": res.unique_albums,
        "uniqueArtists": res.unique_artists,
        "peakHour": f"{peak_h_val}h" if peak_h_val is not None else "--h",
        "peakDay": days_names[peak_d_idx] if peak_d_idx is not None else "--",
        "peakMonth": peak_m_name,
        "avgTimePerDay": (res.total_ms // 60000) // (res.days_count or 1),
        "avgStreamsPerDay": round(res.total_streams / (res.days_count or 1), 1),
        "ratio": min(round(res.completion or 0, 1), 100.0),
        "clockData": clock_data,
        "weeklyData": weekly_data,
        "monthlyData": monthly_data,
        "annualData": annual_data,
        "cumulativeData": cumulative_data,
        "topTrack": get_top_item(session,filters,'track'),
        "topAlbum": get_top_item(session,filters,'album'),
        "topArtist": get_top_item(session,filters,'artist'),
        "entityEvolution": evolution_sorted,
        "streamsEvolution": get_streams_evolution(target_user.id,start_date,end_date,session)
    }

def get_top_item(session, filters, target: Literal['track', 'album', 'artist']):
    def get_top_stat(target: Literal['track', 'album', 'artist'], metric: Literal['ms', 'count']):
        agg_col = func.sum(TrackHistory.ms_played) if metric == 'ms' else func.count(TrackHistory.id)
        label = "total_ms" if metric == 'ms' else "total_count"
        group_id = {'track': TrackHistory.spotify_id, 'album': TrackHistory.album_id, 'artist': TrackHistory.artist_id}[target]

        subq = (
            select(group_id.label("sid"), agg_col.label(label))
            .where(*filters).group_by(group_id)
            .order_by(desc(label)).limit(1).subquery()
        )

        if target == 'track':
            columns = [Track.title, Artist.name.label("artist_name"), Album.name.label("album_name"), Album.image_url]
            joins = lambda s: s.join(Track, Track.spotify_id == subq.c.sid).join(Album, Track.album_id == Album.spotify_id).join(Artist, Album.artist_id == Artist.spotify_id)
        elif target == 'album':
            columns = [Album.name.label("album_name"), Artist.name.label("artist_name"), Album.image_url]
            joins = lambda s: s.join(Album, Album.spotify_id == subq.c.sid).join(Artist, Album.artist_id == Artist.spotify_id)
        else: # artist
            columns = [Artist.name.label("artist_name"), Artist.image_url]
            joins = lambda s: s.join(Artist, Artist.spotify_id == subq.c.sid)

        return session.exec(joins(select(*columns, getattr(subq.c, label)))).first()

    def format_item(res, type_item: Literal['track', 'album', 'artist']):
        if not res: return None
        return {
            "name": res.title if type_item == 'track' else (res.album_name if type_item == 'album' else res.artist_name),
            "artist": res.artist_name if type_item != 'artist' else None,
            "album": res.album_name if type_item == 'track' else None,
            "image": res.image_url
        }
    
    return [format_item(get_top_stat(target, 'ms'),target),format_item(get_top_stat(target, 'count'),target)]

def get_streams_evolution(
    user_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    session: Session = Depends(get_session)
):
    filters = [TrackHistory.user_id == user_id]
    if start_date: filters.append(TrackHistory.played_at >= start_date)
    if end_date: filters.append(TrackHistory.played_at <= end_date)

    daily_streams_stmt = (
        select(
            func.date(TrackHistory.played_at).label("day"),
            func.count(TrackHistory.id).label("streams"),
            func.sum(TrackHistory.ms_played).label("ms")
        )
        .where(*filters)
        .group_by("day")
        .order_by("day")
    )
    results = session.exec(daily_streams_stmt).all()
    
    if not results: return []
    evolution_data = []
    
    # Dictionnaire pour accès rapide : {date_str: {streams, minutes}}
    data_map = {
        r.day.isoformat(): {
            "streams": r.streams,
            "minutes": round(r.ms / 60000, 1)
        } for r in results
    }
    
    start_day = results[0].day
    end_day = results[-1].day
    current_day = start_day
    
    from datetime import timedelta
    
    while current_day <= end_day:
        d_str = current_day.isoformat()
        day_data = data_map.get(d_str, {"streams": 0, "minutes": 0})
        
        evolution_data.append({
            "date": d_str,
            "display_date": current_day.strftime("%d/%m"),
            "streams": day_data["streams"],
            "minutes": day_data["minutes"]
        })
        current_day += timedelta(days=1)

    return evolution_data