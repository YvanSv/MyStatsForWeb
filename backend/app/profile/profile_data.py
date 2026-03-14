from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Depends
from sqlmodel import Session, select, func, desc
from app.database import get_session
from app.models import User, TrackHistory, Track, Artist, Album

def get_optional_user(session_id: Optional[str], db: Session):
    if not session_id:
        return None
    return db.exec(select(User).where(User.session_id == session_id)).first()

router = APIRouter()

@router.get("/{slug}")
def get_user_profile(slug: str, session: Session = Depends(get_session), session_id: Optional[str] = Cookie(None)):
    if slug.isdigit():
        # On cherche d'abord par ID, si rien on cherche par slug (au cas où l'ID 123 n'existe pas mais le slug "123" oui)
        target_user = session.get(User, int(slug))
        if not target_user: target_user = session.exec(select(User).where(User.slug == slug)).first()
    else: target_user = session.exec(select(User).where(User.slug == slug)).first()
    if not target_user: raise HTTPException(status_code=404, detail="Profil introuvable")
    user_id = target_user.id

    # Identifier qui regarde (le visiteur)
    visitor = get_optional_user(session_id, session)
    is_owner = visitor is not None and visitor.id == target_user.id
    # On bloque si le profil est privé ET que ce n'est pas le proprio
    if not target_user.perms.get("profile", True) and not is_owner: raise HTTPException(status_code=403, detail="Profil privé")

    # --- 0. INITIALISATION (Pour éviter les crashs si perms=False) ---
    total_minutes, total_streams, peak_hour = 0, 0, "N/A"
    top_tracks, top_artists, top_albums, recent_tracks = [], [], [], []

    # --- 1. STATS GLOBALES (Minutes & Streams) ---
    if target_user.perms.get("stats", True) or is_owner:
        stats = session.exec(
            select(
                func.sum(TrackHistory.ms_played).label("total_ms"),
                func.count(TrackHistory.id).label("total_streams")
            ).where(TrackHistory.user_id == user_id)
        ).first()
        
        total_minutes = int((stats.total_ms or 0) / 60000)
        total_streams = stats.total_streams or 0

        # --- HEURE DE POINTE (Peak Hour) ---
        peak_hour_query = (
            select(func.extract('hour', TrackHistory.played_at).label("hour"))
            .where(TrackHistory.user_id == user_id)
            .group_by("hour")
            .order_by(desc(func.count(TrackHistory.id)))
            .limit(1)
        )
        peak_hour_res = session.exec(peak_hour_query).first()
        peak_hour = f"{int(peak_hour_res)}h" if peak_hour_res is not None else "N/A"

    # --- 3. TOP 50 TRACKS ---
    if target_user.perms.get("favorites", True) or is_owner:
        top_tracks_raw = session.exec(
            select(Track, Artist, Album, func.count(TrackHistory.id).label("play_count"))
            .join(Track, TrackHistory.spotify_id == Track.spotify_id)
            .join(Artist, Track.artist_id == Artist.spotify_id)
            .join(Album, Track.album_id == Album.spotify_id)
            .where(TrackHistory.user_id == user_id)
            .group_by(Track.spotify_id, Artist.spotify_id, Album.spotify_id)
            .order_by(desc("play_count"))
            .limit(50)
        ).all()

        top_tracks = [{
            "name": t.title,
            "image_url": alb.image_url,
            "sub": art.name,
            "count": count
        } for t, art, alb, count in top_tracks_raw]

        # --- 4. TOP 50 ARTISTS ---
        top_artists_raw = session.exec(
            select(Artist, func.count(TrackHistory.id).label("play_count"))
            .select_from(TrackHistory)
            .join(Track, TrackHistory.spotify_id == Track.spotify_id)
            .join(Artist, Track.artist_id == Artist.spotify_id)
            .where(TrackHistory.user_id == user_id)
            .group_by(Artist.spotify_id)
            .order_by(desc("play_count"))
            .limit(50)
        ).all()

        top_artists = [{
            "name": art.name,
            "image_url": art.image_url or f"https://api.dicebear.com/7.x/initials/svg?seed={art.name}",
            "sub": f"{count} streams",
            "count": count
        } for art, count in top_artists_raw]

        # --- 5. TOP 50 ALBUMS ---
        top_albums_raw = session.exec(
            select(Album, Artist, func.count(TrackHistory.id).label("play_count"))
            .select_from(TrackHistory)
            .join(Track, TrackHistory.spotify_id == Track.spotify_id)
            .join(Album, Track.album_id == Album.spotify_id)
            .join(Artist, Album.artist_id == Artist.spotify_id)
            .where(TrackHistory.user_id == user_id)
            .group_by(Album.spotify_id, Artist.spotify_id)
            .order_by(desc("play_count"))
            .limit(50)
        ).all()

        top_albums = [{
            "name": alb.name,
            "image_url": alb.image_url,
            "sub": art.name,
            "count": count
        } for alb, art, count in top_albums_raw]

    # --- 6. 50 DERNIÈRES ÉCOUTES ---
    if target_user.perms.get("history", True) or is_owner:
        recent_history = session.exec(
            select(TrackHistory, Track, Artist, Album)
            .join(Track, TrackHistory.spotify_id == Track.spotify_id)
            .join(Artist, Track.artist_id == Artist.spotify_id)
            .join(Album, Track.album_id == Album.spotify_id)
            .where(TrackHistory.user_id == user_id)
            .order_by(desc(TrackHistory.played_at))
            .limit(50)
        ).all()

        recent_tracks = [{
            "id": h.id,
            "title": t.title,
            "artist": art.name,
            "image_url": alb.image_url,
            "played_at": h.played_at
        } for h, t, art, alb in recent_history]

    return {
        "display_name": target_user.display_name,
        "avatar": target_user.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={target_user.display_name}",
        "bio": target_user.bio or "Aucune biographie.",
        "banner": target_user.banner_url or "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
        "total_minutes": total_minutes,
        "total_streams": total_streams,
        "peak_hour": peak_hour,
        "top_50_tracks": top_tracks,
        "top_50_artists": top_artists,
        "top_50_albums": top_albums,
        "recent_tracks": recent_tracks,
        "perms": target_user.perms
    }