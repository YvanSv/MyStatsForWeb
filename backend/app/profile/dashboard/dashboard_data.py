from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
import sqlalchemy
from sqlmodel import Session, col, select, func, desc
from app.database import get_session
from app.models import TrackHistory, Track, Album, Artist

router = APIRouter()

@router.get("/{user_id}")
def get_dashboard_data(
    user_id: int, 
    start_date: Optional[datetime] = Query(None), 
    end_date: Optional[datetime] = Query(None), 
    session: Session = Depends(get_session)
):
    # 1. Filtres communs
    filters = [TrackHistory.user_id == user_id]
    if start_date: filters.append(TrackHistory.played_at >= start_date)
    if end_date: filters.append(TrackHistory.played_at <= end_date)

    # 2. Stats Globales
    stats_stmt = (
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
    )
    res = session.exec(stats_stmt).first()

    # 3. Graphique Horloge (Timezone +1h)
    clock_res = session.exec(
        select(
            func.extract('hour', TrackHistory.played_at + func.cast('1 hours', sqlalchemy.Interval)).label("hour"),
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters).group_by("hour")
    ).all()

    clock_data = [{"hour": f"{h}h", "value": 0, "streams": 0} for h in range(24)]
    peak_h_val, max_ms_h = None, 0
    for r in clock_res:
        h_int = int(r.hour)
        clock_data[h_int]["value"] = round(r.ms / 60000, 1)
        clock_data[h_int]["streams"] = r.streams
        if r.ms > max_ms_h:
            max_ms_h, peak_h_val = r.ms, h_int

    # 4. Graphique Hebdo (Day of Week)
    day_res = session.exec(
        select(
            func.extract('dow', TrackHistory.played_at).label("day"), 
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters).group_by("day")
    ).all()

    days_names = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    weekly_data = [{"day": d[:3], "value": 0, "streams": 0} for d in days_names]
    peak_d_idx, max_ms_d = None, 0
    for r in day_res:
        d_idx = int(r.day)
        weekly_data[d_idx]["value"] = round(r.ms / 60000, 1)
        weekly_data[d_idx]["streams"] = r.streams
        if r.ms > max_ms_d:
            max_ms_d, peak_d_idx = r.ms, d_idx

    # 5. Graphique Mensuel
    month_res = session.exec(
        select(
            func.extract('month', TrackHistory.played_at).label("month"), 
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters).group_by("month")
    ).all()

    months_names = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    months_acro = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    monthly_data = [{"month": m, "value": 0, "streams": 0} for m in months_acro]
    peak_month_value = -1
    peak_month_name = "--"

    for r in month_res:
        month_idx = int(r.month) - 1
        val_min = round(r.ms / 60000, 1)
        monthly_data[month_idx]["value"] = val_min
        monthly_data[month_idx]["streams"] = r.streams
        if val_min > peak_month_value:
            peak_month_value = val_min
            peak_month_name = months_names[month_idx]

    # --- NOUVEAU : 6. Graphique Cumulé (AreaChart) ---
    daily_res = session.exec(
        select(
            func.date(TrackHistory.played_at).label("day"),
            func.sum(TrackHistory.ms_played).label("ms"),
            func.count(TrackHistory.id).label("streams")
        )
        .where(*filters)
        .group_by("day")
        .order_by("day")
    ).all()

    cumulative_data = []
    running_ms = 0
    running_streams = 0
    for r in daily_res:
        running_ms += r.ms
        running_streams += r.streams
        cumulative_data.append({
            "full_date": r.day.isoformat(),
            "display_date": r.day.strftime("%d/%m/%y"), 
            "minutes": round(running_ms / 60000, 1),
            "streams": running_streams
        })

    # 7. Formatage final
    effective_days = res.days_count or 1
    total_min = res.total_ms // 60000

    ############################################
    # Top Track
    top_track_stmt = (
        select(
            Track.title,
            Artist.name.label("artist_name"),
            Album.name.label("album_name"),
            Album.image_url,
            func.sum(TrackHistory.ms_played).label("total_ms"),
        )
        .select_from(TrackHistory)
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .join(Album, Track.album_id == Album.spotify_id)
        .join(Artist, Album.artist_id == Artist.spotify_id)
        .where(*filters)
        .group_by(Track.spotify_id, Artist.name, Album.name, Album.image_url)
        .order_by(desc("total_ms"))
        .limit(1)
    )
    top_track_count_stmt = (
        select(
            Track.title,
            Artist.name.label("artist_name"),
            Album.name.label("album_name"),
            Album.image_url,
            func.count(TrackHistory.id).label("total_streams"),
        )
        .select_from(TrackHistory)
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .join(Album, Track.album_id == Album.spotify_id)
        .join(Artist, Album.artist_id == Artist.spotify_id)
        .where(*filters)
        .group_by(Track.spotify_id, Artist.name, Album.name, Album.image_url)
        .order_by(desc("total_streams"))
        .limit(1)
    )

    t_res = session.exec(top_track_stmt).first()
    count_res = session.exec(top_track_count_stmt).first()
    def format_track(res):
        if not res: return None
        return {
            "name": res.title,
            "artist": res.artist_name,
            "album": res.album_name,
            "image": res.image_url
        }

    # Top Album
    top_album_ms_stmt = (
        select(Artist.name.label("artist_name"), Album.name.label("album_name"), Album.image_url, func.sum(TrackHistory.ms_played).label("total_ms"))
        .select_from(TrackHistory).join(Track).join(Album).join(Artist).where(*filters)
        .group_by(Album.spotify_id, Artist.name, Album.name, Album.image_url).order_by(desc("total_ms")).limit(1)
    )
    # Top Album par Streams (Count)
    top_album_count_stmt = (
        select(Artist.name.label("artist_name"), Album.name.label("album_name"), Album.image_url, func.count(TrackHistory.id).label("total_count"))
        .select_from(TrackHistory).join(Track).join(Album).join(Artist).where(*filters)
        .group_by(Album.spotify_id, Artist.name, Album.name, Album.image_url).order_by(desc("total_count")).limit(1)
    )

    # Top Artist
    top_artist_ms_stmt = (
        select(Artist.name.label("artist_name"), Artist.image_url, func.sum(TrackHistory.ms_played).label("total_ms"))
        .select_from(TrackHistory).join(Track).join(Album).join(Artist).where(*filters)
        .group_by(Artist.spotify_id, Artist.name, Artist.image_url).order_by(desc("total_ms")).limit(1)
    )
    # Top Artiste par Streams (Count)
    top_artist_count_stmt = (
        select(Artist.name.label("artist_name"), Artist.image_url, func.count(TrackHistory.id).label("total_count"))
        .select_from(TrackHistory).join(Track).join(Album).join(Artist).where(*filters)
        .group_by(Artist.spotify_id, Artist.name, Artist.image_url).order_by(desc("total_count")).limit(1)
    )

    alb_ms_res = session.exec(top_album_ms_stmt).first()
    alb_ct_res = session.exec(top_album_count_stmt).first()
    art_ms_res = session.exec(top_artist_ms_stmt).first()
    art_ct_res = session.exec(top_artist_count_stmt).first()

    def format_item(res, is_artist=False):
        if not res: return None
        return {
            "name": res.artist_name if is_artist else res.album_name,
            "artist": res.artist_name if not is_artist else None,
            "image": res.image_url
        }

    return {
        "totalTime": f"{total_min:,}".replace(',', ' ') + " min",
        "totalStreams": res.total_streams,
        "uniqueTracks": res.unique_tracks,
        "uniqueAlbums": res.unique_albums,
        "uniqueArtists": res.unique_artists,
        "peakHour": f"{peak_h_val}h" if peak_h_val is not None else "--h",
        "peakDay": days_names[peak_d_idx] if peak_d_idx is not None else "--",
        "peakMonth": peak_month_name,
        "avgTimePerDay": f"{total_min // effective_days} min",
        "avgStreamsPerDay": round(res.total_streams / effective_days, 1),
        "ratio": f"{min(round(res.completion or 0, 1), 100.0)}%",
        "clockData": clock_data,
        "weeklyData": weekly_data,
        "monthlyData": monthly_data,
        "cumulativeData": cumulative_data,
        "topTrack": [format_track(t_res),format_track(count_res)],
        "topAlbum": [format_item(alb_ms_res),format_item(alb_ct_res)],
        "topArtist": [format_item(art_ms_res,True),format_item(art_ct_res,True)]
    }