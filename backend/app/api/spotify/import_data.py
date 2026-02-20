import json
import hashlib
import random
import time
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select, or_, update
from app.database import get_session, engine
from app.models import User, Track, TrackHistory, Artist, Album
from app.utils.spotify_api import get_spotify_client

router = APIRouter()

def stable_hash(text: str) -> str:
    """Génère un ID stable et unique basé sur le contenu pour éviter les doublons."""
    normalized = text.strip().lower()
    return f"gen_{hashlib.md5(normalized.encode()).hexdigest()[:16]}"

async def enrich_tracks_metadata(track_ids: List[str]):
    """
    Tâche de fond : récupère les vraies durées et images via Spotify.
    Note : On ne traite que les IDs qui ne commencent pas par 'gen_'.
    """
    sp = get_spotify_client()
    # Filtrage des IDs : on ne demande à Spotify que les vrais IDs (Base62)
    valid_ids = list(set([tid for tid in track_ids if not tid.startswith("gen_")]))
    
    if not valid_ids:
        return

    with Session(engine) as db:
        for i in range(0, len(valid_ids), 50):
            batch = valid_ids[i:i+50]
            try:
                sp_data = sp.tracks(batch)
                for track_info in sp_data.get('tracks', []):
                    if not track_info: continue
                    
                    track_db = db.exec(select(Track).where(Track.spotify_id == track_info['id'])).first()
                    if track_db:
                        # Mise à jour de la durée réelle
                        track_db.duration_ms = track_info['duration_ms']
                        
                        # Mise à jour de l'image de l'album si absente
                        album_db = db.exec(select(Album).where(Album.spotify_id == track_db.album_id)).first()
                        if album_db and not album_db.image_url:
                            images = track_info['album'].get('images', [])
                            if images:
                                # On prend l'image de taille moyenne (index 1) si possible
                                album_db.image_url = images[1]['url'] if len(images) > 1 else images[0]['url']
                db.commit()
            except Exception as e:
                print(f"Erreur lors de l'enrichissement batch {i}: {e}")
                continue

@router.post("/upload-json")
async def upload_spotify_json(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    # 1. Authentification de l'utilisateur
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Non connecté")

    new_tracks_to_enrich = []
    stats = {"added": 0, "skipped": 0}

    for file in files:
        content = await file.read()
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            continue

        for entry in data:
            # Extraction des données du format "Account Data"
            track_name = entry.get("master_metadata_track_name")
            artist_name = entry.get("master_metadata_album_artist_name")
            album_name = entry.get("master_metadata_album_album_name")
            track_uri = entry.get("spotify_track_uri")
            ms_played = entry.get("ms_played") or 0
            played_at = entry.get("ts")

            # Filtrage de base (ignore les podcasts ou écoutes trop courtes)
            if not track_name or not track_uri or ms_played < 3000:
                stats["skipped"] += 1
                continue

            # Extraction de l'ID Spotify
            spotify_id = track_uri.split(":")[-1]
            if not spotify_id or len(spotify_id) < 15:
                continue

            try:
                # --- ANTI-DOUBLON HISTORIQUE ---
                existing_h = db.exec(select(TrackHistory).where(
                    TrackHistory.user_id == user.id,
                    TrackHistory.played_at == played_at,
                    TrackHistory.spotify_id == spotify_id
                )).first()
                if existing_h: continue

                # --- CRÉATION / RÉCUPÉRATION HIÉRARCHIQUE ---
                
                # 1. Artiste (Recherche par ID stable ou Nom ILIKE)
                artist_id_stable = stable_hash(artist_name)
                artist = db.exec(select(Artist).where(
                    or_(Artist.spotify_id == artist_id_stable, Artist.name.ilike(artist_name.strip()))
                )).first()
                
                if not artist:
                    artist = Artist(name=artist_name, spotify_id=artist_id_stable)
                    db.add(artist)
                    db.flush()

                # 2. Album (Hash combiné pour éviter les collisions entre artistes différents)
                album_id_stable = stable_hash(f"{album_name}_{artist.name}")
                album = db.exec(select(Album).where(Album.spotify_id == album_id_stable)).first()
                
                if not album:
                    album = Album(name=album_name, artist_id=artist.spotify_id, spotify_id=album_id_stable)
                    db.add(album)
                    db.flush()

                # 3. Track
                track = db.exec(select(Track).where(Track.spotify_id == spotify_id)).first()
                if not track:
                    track = Track(
                        spotify_id=spotify_id,
                        title=track_name,
                        artist_id=artist.spotify_id,
                        album_id=album.spotify_id,
                        duration_ms=0 # Sera complété par la Background Task
                    )
                    db.add(track)
                    new_tracks_to_enrich.append(spotify_id)
                    db.flush()

                # 4. Historique
                db.add(TrackHistory(
                    user_id=user.id,
                    spotify_id=spotify_id,
                    played_at=played_at,
                    ms_played=ms_played
                ))
                stats["added"] += 1

            except Exception as e:
                db.rollback()
                print(f"Erreur lors du traitement d'une ligne : {e}")
                continue

        # Commit par fichier pour garantir la persistance et libérer la mémoire
        db.commit()

    # Déclenchement de l'enrichissement des données via l'API Spotify
    if new_tracks_to_enrich:
        background_tasks.add_task(enrich_tracks_metadata, new_tracks_to_enrich)

    return {
        "status": "success", 
        "message": f"Importation réussie : {stats['added']} écoutes ajoutées."
    }

@router.post("/fix-missing-covers")
async def fix_missing_covers(background_tasks: BackgroundTasks):
    """Endpoint pour lancer le rattrapage en arrière-plan"""
    background_tasks.add_task(catch_up_album_images)
    return {"status": "started", "message": "Le rattrapage des images a commencé."}

def catch_up_album_images():
    sp = get_spotify_client()
    with Session(engine) as db:
        # 1. On cherche les tracks dont l'album n'a pas d'image
        # On fait une jointure pour récupérer les vrais IDs de tracks à envoyer à Spotify
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
            batch = track_ids[i:i+50]
            try:
                sp_tracks = sp.tracks(batch)['tracks']
                
                for t_info in sp_tracks:
                    if not t_info: continue
                    
                    # Récupération de l'image
                    images = t_info['album'].get('images', [])
                    if images:
                        url = images[0]['url']
                        # Mise à jour de TOUS les albums qui ont cet ID (qu'il soit gen_ ou réel)
                        # car on récupère l'album_id directement depuis la base
                        actual_album_id = next(r[1] for r in results if r[0] == t_info['id'])
                        db.execute(
                            update(Album)
                            .where(Album.spotify_id == actual_album_id)
                            .values(image_url=url)
                        )
                db.commit()
                print(f"Batch {i//50 + 1} traité. Pause de sécurité...")
                # Ajoute une pause entre 1 et 3 secondes entre chaque appel de 50 tracks
                time.sleep(random.uniform(1.0, 3.0))
            except Exception as e:
                # Si on détecte un Rate Limit dans l'exception, on s'arrête proprement
                if "429" in str(e):
                    print("Rate limit atteint. Arrêt du script.")
                    return
                print(f"Erreur: {e}")
                db.rollback()