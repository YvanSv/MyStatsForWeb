import random
import re
import time
from fastapi import BackgroundTasks, APIRouter
from sqlmodel import Session, select, update
from app.models import Artist
from app.spotify.utils.spotify_status import spotify_status
from app.spotify.utils.spotify_api import get_spotify_client
from app.database import engine

router = APIRouter()

@router.post('')
async def fix_missing_covers(background_tasks: BackgroundTasks):
    """Endpoint pour lancer le rattrapage en arrière-plan"""
    background_tasks.add_task(catch_up_maintenance)
    return {"status": "started", "message": "Le rattrapage des images et de la durée a commencé."}

def catch_up_maintenance():
    sp = get_spotify_client()
    with Session(engine) as db:
        # --- PHASE ARTISTES 1.1 : RÉCUPÉRATION MASSIVE DES IMAGES D'ARTISTES (Batch SQL) ---
        real_artists_no_img = db.exec(select(Artist).where(Artist.image_url == None)).all()
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