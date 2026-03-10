from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlmodel import Session
from app.database import get_session
from app.models import User, TrackHistory, Track, Album, Artist

router = APIRouter()

@router.get('')
async def get_artists(db: Session = Depends(get_session)):
    user_count = db.exec(select(func.count(User.id))).first()[0]
    streams_count = db.exec(select(func.count(TrackHistory.id))).first()[0]
    tracks_count = db.exec(select(func.count(Track.spotify_id))).first()[0]
    albums_count = db.exec(select(func.count(Album.spotify_id))).first()[0]
    artists_count = db.exec(select(func.count(Artist.spotify_id))).first()[0]
    return {
        "users": user_count,
        "streams": streams_count,
        "tracks": tracks_count,
        "albums": albums_count,
        "artists": artists_count
    }