import random
import re
import time

from fastapi import BackgroundTasks, APIRouter
from sqlmodel import Session, select, update

from app.models import Album, Artist, Track
from app.utils.spotify_status import spotify_status
from app.utils.spotify_api import get_spotify_client
from app.database import engine

router = APIRouter()

@router.post("/fix-missing-covers")
async def fix_missing_covers(background_tasks: BackgroundTasks):
    """Endpoint pour lancer le rattrapage en arrière-plan"""
    background_tasks.add_task(catch_up_maintenance)
    return {"status": "started", "message": "Le rattrapage des images et de la durée a commencé."}

def catch_up_maintenance():
    sp = get_spotify_client()
    with Session(engine) as db:
        # --- PHASE 1 : TRACKS & ALBUMS (Durée + Covers) ---
        # On cherche tout ce qui est incomplet
        query_tracks = (
            select(Track)
            .join(Album, Track.album_id == Album.spotify_id)
            .where((Album.image_url == None) | (Track.duration_ms == 0) | (Track.duration_ms == None))
            .where(~Track.spotify_id.contains("gen_"))
            .limit(400)
        )
        tracks_to_fix = db.exec(query_tracks).all()
        
        if tracks_to_fix:
            track_ids = [t.spotify_id for t in tracks_to_fix]
            random.shuffle(track_ids)
            for i in range(0, len(track_ids), 50):
                if spotify_status.get_status()["is_rate_limited"]: return
                
                batch = track_ids[i:i+50]
                try:
                    sp_tracks = sp.tracks(batch)['tracks']
                    for t_info in sp_tracks:
                        if not t_info: continue

                        t_id = t_info['id']
                        duration = t_info['duration_ms']
                        
                        # Update Track Duration
                        if duration:
                            db.execute(update(Track).where(Track.spotify_id == t_id)
                                .values(duration_ms=duration))
                        
                        # Update Album Cover
                        album_info = t_info.get('album', {})
                        images = album_info.get('images', [])
                        album_id = album_info.get('id')

                        if images and album_id:
                            url = images[0]['url']
                            db.execute(
                                update(Album)
                                .where(Album.spotify_id == album_id)
                                .values(image_url=url)
                            )

                    db.commit()
                    time.sleep(random.uniform(1.0, 2.0))
                except Exception as e:
                    handle_exception(e)
                    return

        # --- PHASE 2 : ARTISTES (Images) ---
        query_artists = (
            select(Artist)
            .where(Artist.image_url == None)
            .where(~Artist.spotify_id.contains("gen_"))
            .limit(400)
        )
        artists_to_fix = db.exec(query_artists).all()

        if artists_to_fix:
            artist_ids = [a.spotify_id for a in artists_to_fix]
            random.shuffle(artist_ids)
            for i in range(0, len(artist_ids), 50):
                if spotify_status.get_status()["is_rate_limited"]: return
                
                batch = artist_ids[i:i+50]
                try:
                    sp_artists = sp.artists(batch)['artists']
                    for a_info in sp_artists:
                        if a_info and a_info.get('images'):
                            db.execute(update(Artist).where(Artist.spotify_id == a_info['id'])
                                      .values(image_url=a_info['images'][0]['url']))
                    db.commit()
                    time.sleep(random.uniform(1.0, 2.0))
                except Exception as e:
                    handle_exception(e)
                    return

def handle_exception(e):
    error_str = str(e)
    if "429" in error_str:
        retry_seconds = 300
        match = re.search(r'in (\d+) seconds', error_str)
        if match: retry_seconds = int(match.group(1))
        spotify_status.set_rate_limited(seconds=retry_seconds)
    else:
        print(f"Erreur maintenance: {e}")