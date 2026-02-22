import random
import re
import time

from fastapi import BackgroundTasks, APIRouter
from sqlmodel import Session, select, text, update

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
        # --- PHASE 0 : NETTOYAGE DES ALBUMS GEN_ SANS TRACKS ---
        # On supprime les albums générés qui n'ont plus aucune musique liée
        db.execute(text("""
            DELETE FROM album 
            WHERE spotify_id LIKE 'gen_%' 
            AND spotify_id NOT IN (SELECT DISTINCT album_id FROM track)
        """))
        db.commit()
        print("🧹 Nettoyage des albums gen_ orphelins terminé.")

        # --- PHASE 1 : SUTURE MASSIVE (Tracks & Albums gen_) ---
        # On récupère les tracks liées à un album gen_
        results = db.exec(
            select(Track, Album)
            .join(Album, Track.album_id == Album.spotify_id)
            .where(Album.spotify_id.contains("gen_"))
            .limit(2500)
        ).all()

        if results:
            # On extrait les données brutes pour éviter les erreurs de session
            track_data_list = [
                {
                    "track_id": t.spotify_id,
                    "old_album_id": a.spotify_id,
                    "album_name": a.name,
                    "artist_id": a.artist_id
                } for t, a in results
            ]

            for i in range(0, len(track_data_list), 50):
                if spotify_status.get_status()["is_rate_limited"]: return
                
                batch = track_data_list[i:i+50]
                batch_ids = [d["track_id"] for d in batch]
                processed_albums = set() 

                try:
                    sp_tracks = sp.tracks(batch_ids)['tracks']
                    
                    for t_info, local_data in zip(sp_tracks, batch):
                        if not t_info: continue
                        
                        real_album_id = t_info['album']['id']
                        old_gen_id = local_data["old_album_id"]

                        # Si l'ID est gen_ et qu'on ne l'a pas encore traité dans ce batch
                        if "gen_" in old_gen_id and old_gen_id not in processed_albums:
                            # Vérifier l'existence du vrai album
                            existing = db.exec(select(Album).where(Album.spotify_id == real_album_id)).first()
                            
                            if not existing:
                                img = t_info['album']['images'][0]['url'] if t_info['album']['images'] else None
                                db.add(Album(
                                    spotify_id=real_album_id, 
                                    name=local_data["album_name"], 
                                    image_url=img, 
                                    artist_id=local_data["artist_id"]
                                ))
                                db.flush()

                            # Redirection massive et suppression du gen_
                            db.execute(text("UPDATE track SET album_id = :new WHERE album_id = :old"), {"new": real_album_id, "old": old_gen_id})
                            db.execute(text("DELETE FROM album WHERE spotify_id = :old"), {"old": old_gen_id})
                            processed_albums.add(old_gen_id)

                        # Mise à jour duration
                        db.execute(update(Track).where(Track.spotify_id == t_info['id']).values(duration_ms=t_info['duration_ms']))

                    db.commit()
                    print(f"✅ Batch Albums {i//50 + 1} traité.")
                    time.sleep(random.uniform(1.5, 3.0))
                except Exception as e:
                    handle_exception(e)
                    db.rollback()
                    print(f"⚠️ Erreur batch : {e}")

        # --- PHASE ARTISTES 2.1 : RÉCUPÉRATION MASSIVE (Batch SQL) ---
        real_artists_no_img = db.exec(
            select(Artist)
            .where(Artist.image_url == None)
            .where(~Artist.spotify_id.contains("gen_"))
            .limit(2500) 
        ).all()

        if real_artists_no_img:
            all_ids = [a.spotify_id for a in real_artists_no_img]
            print(f"🖼️ Tentative de récupération d'images pour {len(all_ids)} artistes...")
            for i in range(0, len(all_ids), 50):
                if spotify_status.get_status()["is_rate_limited"]: return
                
                batch_ids = all_ids[i:i+50]
                try:
                    sp_artists = sp.artists(batch_ids)['artists']
                    
                    for sp_art in sp_artists:
                        if sp_art and sp_art.get('images'):
                            img_url = sp_art['images'][0]['url']
                            db.execute(
                                update(Artist)
                                .where(Artist.spotify_id == sp_art['id'])
                                .values(image_url=img_url)
                            )
                    db.commit()
                    print(f"✅ Batch Artistes {i//50 + 1} terminé.")
                    time.sleep(random.uniform(1.5, 3.0))
                except Exception as e:
                    db.rollback()
                    handle_exception(e)
                    break

        # --- PHASE ARTISTES 2.2 : TRANSFORMATION GEN_ (Optimisation SQL) ---
        gen_artists = db.exec(
            select(Artist)
            .where(Artist.spotify_id.contains("gen_"))
            .limit(200)
        ).all()

        if gen_artists:
            print(f"🕵️ Recherche de l'identité réelle pour {len(gen_artists)} artistes...")
            
            count_success = 0
            for art in gen_artists:
                if spotify_status.get_status()["is_rate_limited"]: 
                    db.commit()
                    return
                try:
                    # 1. Appel API (individuel car obligatoire pour Search)
                    search = sp.search(q=f"artist:{art.name}", type="artist", limit=1)
                    items = search.get('artists', {}).get('items', [])
                    
                    if items:
                        real_data = items[0]
                        real_id = real_data['id']
                        img_url = real_data['images'][0]['url'] if real_data.get('images') else None
                        old_id = art.spotify_id

                        # 2. Vérifier si le vrai ID existe déjà
                        existing = db.exec(select(Artist).where(Artist.spotify_id == real_id)).first()
                        
                        if existing:
                            # Redirection des liens vers l'existant
                            db.execute(update(Album).where(Album.artist_id == old_id).values(artist_id=real_id))
                            db.execute(update(Track).where(Track.artist_id == old_id).values(artist_id=real_id))
                            db.delete(art)
                        else:
                            # Transformation de l'actuel (via copie)
                            new_art = Artist(spotify_id=real_id, name=art.name, image_url=img_url)
                            db.add(new_art)
                            db.flush()
                            db.execute(update(Album).where(Album.artist_id == old_id).values(artist_id=real_id))
                            db.execute(update(Track).where(Track.artist_id == old_id).values(artist_id=real_id))
                            db.delete(art)
                        
                        count_success += 1
                        print(f"🚀 {art.name} -> {real_id}")
                    if count_success % 10 == 0: db.commit()
                    time.sleep(random.uniform(1.5, 3.0))
                except Exception as e:
                    handle_exception(e)
                    db.rollback()
                    continue
            db.commit()

        # --- PHASE 3 : FUSION FINALE (Balayage des doublons de noms) ---
        # On traite les albums gen_ qui ont déjà un équivalent officiel créé
        gen_albums = db.exec(select(Album).where(Album.spotify_id.contains("gen_")).limit(1000)).all()
        for gen_alb in gen_albums:
            real_alb = db.exec(select(Album).where(
                Album.name == gen_alb.name, 
                Album.artist_id == gen_alb.artist_id, 
                ~Album.spotify_id.contains("gen_")
            )).first()
            
            if real_alb:
                db.execute(update(Track).where(Track.album_id == gen_alb.spotify_id).values(album_id=real_alb.spotify_id))
                db.delete(gen_alb)
        db.commit()
    print("###---###---###---###---### MAINTENANCE TERMINEE ###---###---###---###---###")

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