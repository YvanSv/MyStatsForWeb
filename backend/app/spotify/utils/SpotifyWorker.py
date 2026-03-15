import asyncio
import random
from typing import List
import spotipy
from sqlalchemy import or_, update
from sqlmodel import Session, select
from app.database import get_session
from app.spotify.utils.spotify_api import get_spotify_client
from app.models import Track,Artist,Album, TrackHistory
from .spotify_status import spotify_status

class SpotifyWorker:
    _instance = None
    _queue = asyncio.Queue()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpotifyWorker, cls).__new__(cls)
            cls._instance.is_running = False
            cls._instance.repair_history = False
        return cls._instance

    async def add_tracks(self, track_ids: List[str]):
        for tid in track_ids: await self._queue.put(("track",tid))
        if not self.is_running: asyncio.create_task(self._process_queue())

    def add_artist(self, artist_id: str):
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Si la boucle tourne déjà, on crée une tâche
            loop.create_task(self._queue.put(("artist", artist_id)))
        else:
            # Cas rare : la boucle ne tourne pas encore
            asyncio.run(self._queue.put(("artist", artist_id)))

    async def should_repair_history(self):
        self.repair_history = True
        if not self.is_running: asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        self.is_running = True
        sp = get_spotify_client()
        
        while not self._queue.empty():
            status = spotify_status.get_status()
            # Si on est blacklist à l'heure actuelle
            if status["is_rate_limited"]:
                await asyncio.sleep(status["retry_after_seconds"] + 1)
                continue

            tracks_batch = []
            artists_batch = []
            # On récupère jusqu'à 50 éléments, peu importe leur type
            while len(tracks_batch) < 50 and len(artists_batch) < 50 and not self._queue.empty():
                item_type, item_id = await self._queue.get()
                if item_type == "track": tracks_batch.append(item_id)
                else: artists_batch.append(item_id)

            try:
                with next(get_session()) as db:
                    # --- TRAITEMENT DES TRACKS ---
                    if tracks_batch:
                        results = sp.tracks(tracks_batch)['tracks']
                        for t in results:
                            if t: self._update_track_metadata(db, t)
                        await asyncio.sleep(random.uniform(1.5,3.0))
                    # --- TRAITEMENT DES ARTISTES ---
                    if artists_batch:
                        results = sp.artists(artists_batch)['artists']
                        for a in results:
                            if a: self._update_artist_metadata(db, a)
                        await asyncio.sleep(random.uniform(1.5,3.0))
                    db.commit()
            except spotipy.exceptions.SpotifyException as e:
                if e.http_status == 429:
                    # 1. On récupère le temps d'attente suggéré par Spotify
                    seconds = int(e.headers.get("Retry-After", 60))
                    print(f"⚠️ Rate Limit atteint. Pause de {seconds}s")
                    # 2. On met à jour le singleton d'état
                    spotify_status.set_rate_limited(seconds)
                    # 3. On remet les IDs dans la file pour ne pas les perdre
                    for tid in tracks_batch: await self._queue.put(("track",tid))
                    for aid in artists_batch: await self._queue.put(("artist",aid))
                    # 4. On attend réellement avant de continuer la boucle
                    await asyncio.sleep(seconds)
                else: print(f"❌ Erreur API Spotify: {e}")
            except Exception as e: print(f"❌ Erreur Worker inattendue: {e}")
            finally:
                for _ in range(len(tracks_batch)+len(artists_batch)): self._queue.task_done()

        if self.repair_history:
            with next(get_session()) as db: await self.repair_track_history_links(db)
        self.repair_history = False

    def _update_track_metadata(self, db: Session, t: dict):
        """
        Prend un objet track de l'API Spotify et met à jour/crée les entrées correspondantes dans la DB.
        """
        # 1. Extraire les IDs Spotify
        sp_track_id = t['id']
        sp_artist_id = t['artists'][0]['id']
        sp_artist_name = t['artists'][0]['name']
        sp_album_id = t['album']['id']
        sp_album_name = t['album']['name']
        sp_album_img = t['album']['images'][0]['url'] if t['album']['images'] else None
        duration_ms = t['duration_ms']

        # 2. Gérer l'Artiste
        artist = db.exec(select(Artist).where(Artist.spotify_id == sp_artist_id)).first()
        # L'artiste n'existe pas encore, on le crée et on le met dans la file d'attente à enrichir
        if not artist:
            artist = Artist(spotify_id=sp_artist_id, name=sp_artist_name)
            db.add(artist)
            db.flush()
            self.add_artist(sp_artist_id)

        # 3. Gérer l'Album
        album = db.exec(select(Album).where(Album.spotify_id == sp_album_id)).first()
        if not album:
            album = Album(
                spotify_id=sp_album_id,
                name=sp_album_name,
                artist_id=sp_artist_id,
                image_url=sp_album_img
            )
            db.add(album)
            db.flush()

        # 4. Mettre à jour la Track existante
        track = db.exec(select(Track).where(Track.spotify_id == sp_track_id)).first()
        if track:
            track.artist_id = sp_artist_id
            track.album_id = sp_album_id
            track.duration_ms = duration_ms
            track.title = t['name'] 
            db.add(track)
    
    def _update_artist_metadata(self, db: Session, sp_artist: dict):
        """
        Prend un objet artist de l'API Spotify et met à jour/crée les entrées correspondantes dans la DB.
        """
        artist = db.exec(select(Artist).where(Artist.spotify_id == sp_artist['id'])).first()
        if artist and sp_artist.get('images'):
            artist.image_url = sp_artist['images'][0]['url']
            db.add(artist)
    
    async def repair_track_history_links(self, session: Session):
        """
        Parcourt l'historique et remplit artist_id et album_id en se basant sur les informations de la table Track.
        """
        print("🛠️ Début de la réparation...")
        while self.repair_history:
            # On cherche les tracks qui ont des IDs manquants
            statement = (
                select(TrackHistory)
                .where(or_(TrackHistory.artist_id == None, TrackHistory.album_id == None))
                .limit(500)
            )
            history_to_fix = session.exec(statement).all()
            
            if not history_to_fix:
                self.repair_history = False
                print("✅ Réparation terminée")
                return

            # On récupère la table de correspondance Track pour éviter de re-requêter 100x
            # On ne prend que les tracks présents dans notre liste à fixer
            track_ids = {h.spotify_id for h in history_to_fix}
            tracks_ref = session.exec(select(Track).where(Track.spotify_id.in_(track_ids))).all()
            
            # Création d'un dictionnaire de mapping pour la performance {spotify_id: Track}
            track_map = {t.spotify_id: t for t in tracks_ref}

            # Mise à jour des objets
            updated_count = 0
            for history in history_to_fix:
                track = track_map.get(history.spotify_id)
                if track:
                    history.artist_id = track.artist_id
                    history.album_id = track.album_id
                    session.add(history)
                    updated_count += 1

            session.commit()
            print(f"🔄 Lot réparé : {updated_count} lignes.")
            await asyncio.sleep(0.3)

spotify_worker = SpotifyWorker()