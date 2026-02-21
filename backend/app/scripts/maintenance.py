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
                        
                        if duration:
                            db.execute(update(Track).where(Track.spotify_id == t_id)
                                .values(duration_ms=duration))
                        
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
                    print(f"✅ Phase 1 : Batch {i//50 + 1} commit avec succès.")
                    time.sleep(random.uniform(1.0, 3.0))
                except Exception as e:
                    handle_exception(e)
                    return

        # --- PHASE 3 : ARTISTES "GEN_" (Search API + Cascade Update) ---
        query_gen_artists = (
            select(Artist)
            .where(Artist.image_url == None)
            .where(Artist.spotify_id.contains("gen_"))
            .limit(20)
        )
        gen_artists = db.exec(query_gen_artists).all()

        if gen_artists:
            print(f"Phase 3 : Tentative pour {len(gen_artists)} artistes...")
            for artist in gen_artists:
                if spotify_status.get_status()["is_rate_limited"]: return
                
                try:
                    search_results = sp.search(q=f"artist:{artist.name}", type="artist", limit=1)
                    items = search_results.get('artists', {}).get('items', [])
                    
                    if items:
                        sp_artist = items[0]
                        real_id = sp_artist['id']
                        old_id = artist.spotify_id
                        img_url = sp_artist['images'][0]['url'] if sp_artist.get('images') else None
                        
                        # 1. Mise à jour manuelle de la cascade (Foreign Keys)
                        # On met à jour les références dans Album et Track avant de changer l'ID de l'Artiste
                        db.execute(update(Album).where(Album.artist_id == old_id).values(artist_id=real_id))
                        db.execute(update(Track).where(Track.artist_id == old_id).values(artist_id=real_id))
                        
                        # 2. Mise à jour de l'artiste
                        artist.spotify_id = real_id
                        artist.image_url = img_url
                        db.add(artist)
                        
                        db.commit()
                        print(f"✅ Artiste migré : {artist.name} ({old_id} -> {real_id})")
                    else:
                        print(f"⚠️ Aucun résultat pour l'artiste : {artist.name}")
                    
                    time.sleep(random.uniform(1.5, 2.5))
                    
                except Exception as e:
                    db.rollback()
                    handle_exception(e)
                    return

def handle_exception(e):
    error_str = str(e)
    if "429" in error_str:
        retry_seconds = 300
        match = re.search(r'in (\d+) seconds', error_str)
        if match: retry_seconds = int(match.group(1))
        spotify_status.set_rate_limited(seconds=retry_seconds)
        print(f"🛑 Rate limit atteint. Pause de {retry_seconds}s.")
    else:
        print(f"❌ Erreur maintenance: {e}")