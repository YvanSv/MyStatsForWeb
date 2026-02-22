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
            .limit(2500)
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
                    time.sleep(random.uniform(1.0, 3.0))
                except Exception as e:
                    handle_exception(e)
                    return

        # --- PHASE 3 : ARTISTES "GEN_" (Optimisée - Commit Global) ---
        query_gen_artists = (
            select(Artist)
            .where(Artist.image_url == None)
            .where(Artist.spotify_id.contains("gen_"))
            .limit(200) 
        )
        gen_artists = db.exec(query_gen_artists).all()

        if gen_artists:
            try:
                for artist in gen_artists:
                    if spotify_status.get_status()["is_rate_limited"]: 
                        db.commit()
                        return

                    search_results = sp.search(q=f"artist:{artist.name}", type="artist", limit=1)
                    items = search_results.get('artists', {}).get('items', [])
                    
                    if items:
                        sp_artist = items[0]
                        real_id = sp_artist['id']
                        old_id = artist.spotify_id
                        img_url = sp_artist['images'][0]['url'] if sp_artist.get('images') else None
                        
                        existing_artist = db.exec(select(Artist).where(Artist.spotify_id == real_id)).first()
                        
                        if existing_artist:
                            db.execute(update(Album).where(Album.artist_id == old_id).values(artist_id=real_id))
                            db.execute(update(Track).where(Track.artist_id == old_id).values(artist_id=real_id))
                            db.delete(artist)
                        else:
                            new_artist = Artist(spotify_id=real_id, name=artist.name, image_url=img_url)
                            db.add(new_artist)
                            db.flush()
                            db.execute(update(Album).where(Album.artist_id == old_id).values(artist_id=real_id))
                            db.execute(update(Track).where(Track.artist_id == old_id).values(artist_id=real_id))
                            db.delete(artist)
                    time.sleep(random.uniform(1.5, 3.0))
                db.commit()

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

def chunk_list(lst, n):
    """Découpe une liste en morceaux de taille n."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

@router.post("/deep-clean")
async def trigger_deep_clean(background_tasks: BackgroundTasks):
    """Lance la réparation des liens cassés (gen_) en arrière-plan"""
    background_tasks.add_task(deep_clean_orphan_tracks)
    return {
        "status": "started", 
        "message": "La réparation des tracks orphelines a commencé en arrière-plan."
    }

def deep_clean_orphan_tracks():
    sp = get_spotify_client()
    with Session(engine) as db:
        # On cherche les tracks qui ont un artist_id "gen_"
        orphans = db.exec(select(Track).where(Track.artist_id.contains("gen_")).limit(2500)).all()
        if not orphans:
            print("Aucune track orpheline trouvée !")
            return

        print(f"Nettoyage de {len(orphans)} tracks...")

        orphan_map = {t.spotify_id: t for t in orphans}
        all_ids = list(orphan_map.keys())

        # 2. Traitement par lots de 50 (Limite API Spotify pour les tracks)
        for batch_ids in chunk_list(all_ids, 50):
            try:
                sp_data = sp.tracks(batch_ids)['tracks']
                
                for track_info in sp_data:
                    if not track_info: continue
                    
                    track_id = track_info['id']
                    real_artist_id = track_info['artists'][0]['id']
                    real_artist_name = track_info['artists'][0]['name']
                    real_album_id = track_info['album']['id']
                    real_album_name = track_info['album']['name']
                    real_duration = track_info['duration_ms']

                    track_obj = orphan_map.get(track_id)
                    if not track_obj: continue

                    artist = db.exec(select(Artist).where(Artist.spotify_id == real_artist_id)).first()
                    if not artist:
                        artist = Artist(spotify_id=real_artist_id, name=real_artist_name)
                        db.add(artist)
                        db.flush()

                    album = db.exec(select(Album).where(Album.spotify_id == real_album_id)).first()
                    if not album:
                        album = Album(spotify_id=real_album_id, name=real_album_name, artist_id=real_artist_id)
                        db.add(album)
                        db.flush()

                    track_obj.artist_id = real_artist_id
                    track_obj.album_id = real_album_id
                    track_obj.duration_ms = real_duration
                    db.add(track_obj)

                db.commit()
                print(f"   ✨ Batch de {len(batch_ids)} tracks traité avec succès.")
                time.sleep(random.uniform(1.5, 3.0))

            except Exception as e:
                print(f"   ❌ Erreur lors du batch : {e}")
                db.rollback()
                continue

    print("🏁 Fin du nettoyage des orphelins.")