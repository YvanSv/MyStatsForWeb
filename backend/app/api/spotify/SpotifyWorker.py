import asyncio
import random
from typing import List
import spotipy
from sqlmodel import Session, select
from app.database import get_session
from app.utils.spotify_api import get_spotify_client
from app.models import Track,Artist,Album
from app.utils.spotify_status import spotify_status

class SpotifyWorker:
    _instance = None
    _queue = asyncio.Queue()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpotifyWorker, cls).__new__(cls)
            cls._instance.is_running = False
        return cls._instance

    async def add_tracks(self, track_ids: List[str]):
        for tid in track_ids:
            await self._queue.put(tid)
        if not self.is_running:
            asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        self.is_running = True
        sp = get_spotify_client()
        
        while not self._queue.empty():
            status = spotify_status.get_status()
            if status["is_rate_limited"]:
                await asyncio.sleep(status["retry_after_seconds"] + 1)
                continue
            batch = []
            while len(batch) < 50 and not self._queue.empty():
                batch.append(await self._queue.get())

            try:
                results = sp.tracks(batch)['tracks']
                with next(get_session()) as db:
                    for t in results:
                        if not t: continue
                        self._update_track_metadata(db, t)
                    db.commit()
                await asyncio.sleep(random.uniform(1.5,3.0)) 
            except spotipy.exceptions.SpotifyException as e:
                if e.http_status == 429:
                    # 1. On récupère le temps d'attente suggéré par Spotify
                    seconds = int(e.headers.get("Retry-After", 60))
                    print(f"⚠️ Rate Limit atteint. Pause de {seconds}s")
                    # 2. On met à jour le singleton d'état
                    spotify_status.set_rate_limited(seconds)
                    # 3. On remet les IDs dans la file pour ne pas les perdre
                    for tid in batch:
                        await self._queue.put(tid)
                    # 4. On attend réellement avant de continuer la boucle
                    await asyncio.sleep(seconds)
                else: print(f"❌ Erreur API Spotify: {e}")
            except Exception as e: print(f"❌ Erreur Worker inattendue: {e}")
            finally:
                for _ in range(len(batch)): self._queue.task_done()
        
        self.is_running = False

    def _update_track_metadata(self, db: Session, t: dict):
        """
        Prend un objet track de l'API Spotify et met à jour/crée 
        les entrées correspondantes dans la DB.
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
        if not artist:
            artist = Artist(spotify_id=sp_artist_id, name=sp_artist_name)
            db.add(artist)
            db.flush()

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

spotify_worker = SpotifyWorker()