from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select, func, desc
from app.database import get_session
from app.models import User, TrackHistory, Track, Artist, Album

router = APIRouter(tags=["profile"])

@router.get("/{user_id}")
def get_user_profile(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    total_ms = session.exec(
        select(func.sum(TrackHistory.ms_played))
        .where(TrackHistory.user_id == user_id)
    ).first() or 0
    total_minutes = int(total_ms / 60000)

    top_artist_query = (
        select(Artist.name)
        .select_from(TrackHistory)
        .join(Track, TrackHistory.spotify_id == Track.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .where(TrackHistory.user_id == user_id)
        .group_by(Artist.name)
        .order_by(desc(func.count(TrackHistory.id)))
        .limit(1)
    )
    top_artist = session.exec(top_artist_query).first() or "Inconnu"

    recent_history = session.exec(
        select(TrackHistory, Track, Artist, Album)
        .join(Track, TrackHistory.spotify_id == Track.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .join(Album, Track.album_id == Album.spotify_id)
        .where(TrackHistory.user_id == user_id)
        .order_by(desc(TrackHistory.played_at))
        .limit(4)
    ).all()

    formatted_tracks = []
    for history, track, artist, album in recent_history:
        formatted_tracks.append({
            "id": history.id,
            "title": track.title,
            "artist": artist.name,
            "image_url": album.image_url,
            "played_at": history.played_at
        })

    return {
        "display_name": user.display_name,
        "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.display_name}",
        "banner": "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
        "total_minutes": total_minutes,
        "top_artist": top_artist,
        "top_genre": "Analyse en cours...",
        "recent_tracks": formatted_tracks
    }