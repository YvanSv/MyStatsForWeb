import random
import re
import time

from fastapi import BackgroundTasks, APIRouter
from sqlmodel import Session, select, update

from backend.app.models import Album, Track
from backend.app.utils import spotify_status
from backend.app.utils.spotify_api import get_spotify_client
from app.database import engine

router = APIRouter()

@router.post("/fix-missing-covers")
async def fix_missing_covers(background_tasks: BackgroundTasks):
    """Endpoint pour lancer le rattrapage en arrière-plan"""
    background_tasks.add_task(catch_up_album_images)
    return {"status": "started", "message": "Le rattrapage des images et de la durée a commencé."}

def catch_up_album_images():
    sp = get_spotify_client()
    with Session(engine) as db:
        # 1. On cherche les tracks dont l'album n'a pas d'image
        query = (
            select(Track.spotify_id, Track.album_id)
            .join(Album, Track.album_id == Album.spotify_id)
            .where(Album.image_url == None)
            .where(~Track.spotify_id.contains("gen_")) # Uniquement les vrais IDs
            .limit(500) # On traite par paquets de 500 pour ne pas saturer
        )
        results = db.exec(query).all()
        
        # 2. On regroupe par paquets de 50 pour Spotify
        track_ids = [r[0] for r in results]
        for i in range(0, len(track_ids), 50):

            # --- CIRCUIT BREAKER ---
            # Avant chaque batch, on vérifie l'état global
            status = spotify_status.get_status()
            if status["is_rate_limited"]: return

            batch = track_ids[i:i+50]
            try:
                sp_tracks = sp.tracks(batch)['tracks']
                
                for t_info in sp_tracks:
                    if not t_info: continue
                    # Récupération ID, image et durée
                    track_id = t_info['id']
                    images = t_info['album'].get('images', [])
                    duration = t_info['duration_ms']

                    if images:
                        url = images[0]['url']
                        # On récupère l'album_id associé à cette track dans nos résultats locaux
                        actual_album_id = next(r[1] for r in results if r[0] == track_id)
                        db.execute(
                            update(Album)
                            .where(Album.spotify_id == actual_album_id)
                            .values(image_url=url)
                        )
                    
                    if duration:
                        db.execute(
                            update(Track)
                            .where(Track.spotify_id == track_id)
                            .values(duration_ms=duration)
                        )

                db.commit()
                print(f"Batch {i//50 + 1} traité. Pause de sécurité...")
                time.sleep(random.uniform(1.5, 3.0))

            except Exception as e:
                error_str = str(e)
                if "429" in error_str:
                    retry_seconds = 300 
                    match = re.search(r'in (\d+) seconds', error_str)
                    if match: retry_seconds = int(match.group(1))
                    spotify_status.set_rate_limited(seconds=retry_seconds)
                else:
                    print(f"Erreur inattendue: {e}")
                    db.rollback()
                return