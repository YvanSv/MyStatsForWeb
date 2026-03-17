import asyncio
import random
from typing import List
import spotipy
from sqlalchemy import func, or_, text
from sqlmodel import Session, select
from app.database import get_session
from app.spotify.utils.spotify_api import get_spotify_client, get_spotify_users_client
from app.models import Track,Artist,Album, TrackHistory, User
from .spotify_status import spotify_status
from .spotify_token import get_valid_access_token
import datetime


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

    async def get_history_for(self, user_id: int):
        await self._queue.put(("user_history",user_id))
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
            try:
                with next(get_session()) as db:
                    # On récupère jusqu'à 50 éléments, peu importe leur type
                    while len(tracks_batch) < 50 and len(artists_batch) < 50 and not self._queue.empty():
                        item_type, item_id = await self._queue.get()
                        if item_type == "track": tracks_batch.append(item_id)
                        elif item_type == "artist": artists_batch.append(item_id)
                        elif item_type == "user_history": await self.refresh_history(item_id,db)

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
        # Extraire les IDs Spotify
        sp_track_id = t['id']
        sp_artist_id = t['artists'][0]['id']
        sp_artist_name = t['artists'][0]['name']
        sp_album_id = t['album']['id']
        sp_album_name = t['album']['name']
        sp_album_img = t['album']['images'][0]['url'] if t['album']['images'] else None
        duration_ms = t['duration_ms']

        # Gérer l'Artiste
        artist = db.exec(select(Artist).where(Artist.spotify_id == sp_artist_id)).first()
        # L'artiste n'existe pas encore, on le crée et on le met dans la file d'attente à enrichir
        if not artist:
            artist = Artist(spotify_id=sp_artist_id, name=sp_artist_name)
            db.add(artist)
            db.flush()
            self.add_artist(sp_artist_id)

        # Gérer l'Album
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

        # Mettre à jour la Track existante
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

    async def repair_track_history_links(self,db):
        """
        Déclenche la réparation ultra-rapide côté base de données.
        Remplit artist_id et album_id en se basant sur les informations de la table Track.
        """
        print("⚡ Lancement de la réparation SQL interne...")
        try:
            while db.exec(
                select(func.count(TrackHistory.id).label("nb_to_repair"))
                .where(or_(TrackHistory.artist_id == None, TrackHistory.album_id == None))
            ).all()[0] > 0:
                db.exec(text("SELECT repair_track_history();"))
                db.commit()
                await asyncio.sleep(0.3)
            print(f"✅ Réparation SQL terminée.")
        except Exception as e:
            print(f"❌ Erreur lors de la réparation SQL : {e}")

    async def refresh_history(self, user_id: int, session: Session, before: str = None,
                              cache_history=None, cache_tracks=None, cache_albums=None, cache_artists=None):
        """
        Récupère l'historique Spotify et remonte dans le temps jusqu'à trouver une écoute déjà enregistrée.
        """
        user = session.get(User,user_id)
        data = get_spotify_users_client(await get_valid_access_token(user,session)).current_user_recently_played(50,user.last_spotify_sync if before is None else None,before)
        items = data['items']
        await asyncio.sleep(random.uniform(1.5,3))
        if not items: return True

        # CHARGEMENT DU CACHE (Une seule fois au premier appel)
        if cache_history is None:
            cache_history = set(session.exec(select(TrackHistory.played_at, TrackHistory.spotify_id).where(TrackHistory.user_id == user_id)).all())
            cache_tracks = set(session.exec(select(Track.spotify_id)).all())
            cache_albums = set(session.exec(select(Album.spotify_id)).all())
            cache_artists = set(session.exec(select(Artist.spotify_id)).all())
        new_entries, new_tracks, new_albums, new_artists = [], [], [], []
        new_artists_ids = set()
        all_known = True # Flag pour savoir si on a tout trouvé dans cette page

        for item in items:
            track = item['track']

            # --- INFOS ARTISTE ---
            primary_artist = track["artists"][0]
            artist_name = primary_artist["name"]
            artist_sid = primary_artist["id"]

            # --- INFOS ALBUM ---
            album = track["album"]
            album_name = album["name"]
            album_sid = album["id"]
            images = album["images"]
            album_image_url = images[0]["url"] if images else None

            # --- INFOS TRACK ---
            sid = track["id"]
            name = track["name"]
            duration_ms = track['duration_ms']

            # --- INFOS ÉCOUTE ---
            played_at = item['played_at']

            if not sid or not played_at: continue
            try: dt_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except: continue

            # Vérifier si cette écoute existe déjà en base
            if (dt_obj, sid) in cache_history: continue

            all_known = False

            if artist_sid not in cache_artists and artist_sid not in new_artists:
                new_artists.append(Artist(
                    spotify_id=artist_sid,
                    name=artist_name
                ))
                new_artists_ids.add(artist_sid)
            
            if album_sid not in cache_albums and album_sid not in new_albums:
                new_albums.append(Album(
                    spotify_id=album_sid,
                    name=album_name,
                    image_url=album_image_url,
                    artist_id=artist_sid
                ))
            
            if sid not in cache_tracks and sid not in new_tracks:
                new_tracks.append(Track(
                    spotify_id=sid,
                    title=name,
                    artist_id=artist_sid,
                    album_id=album_sid,
                    duration_ms=duration_ms
                ))

            
            new_entries.append(TrackHistory(
                user_id=user.id,
                played_at=played_at,
                ms_played=0,
                spotify_id=sid,
                artist_id=artist_sid,
                album_id=album_sid
            ))

        # Sauvegarder les nouveaux morceaux de cette page
        if new_entries:
            for artist in new_artists: session.add(artist)
            for album in new_albums: session.add(album)
            for track in new_tracks: session.add(track)
            for entry in new_entries: session.add(entry)
            session.commit()
            print(f"Ajout de {len(new_entries)} nouvelles écoutes pour {user.display_name}")
        
        if new_artists_ids:
            for aid in list(new_artists_ids): await self._queue.put(("artist",aid))
        

        # 4. Logique de récursion / Continuité
        # Si on a trouvé au moins un morceau qu'on ne connaissait pas dans les 50,
        # ou si on n'a pas trouvé la "50ème" (all_known est resté False pour certains),
        # on doit vérifier la page précédente.
        cursors = data["cursors"]
        if cursors and cursors["after"]:
            user.last_spotify_sync = cursors["after"]
            before_next = cursors["before"]
            session.add(user)
            session.commit()
            return await self.refresh_history(
                user_id, session, before=before_next,
                cache_history=cache_history, cache_tracks=cache_tracks, 
                cache_albums=cache_albums, cache_artists=cache_artists
            )

spotify_worker = SpotifyWorker()