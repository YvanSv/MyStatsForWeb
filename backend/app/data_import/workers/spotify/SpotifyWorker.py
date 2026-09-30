import asyncio
import spotipy
from sqlmodel import Session, select, update
from app.database import get_session
from app.models import Album, AlbumMapping, ArtistMapping, MusicProvider, Track, Artist, TrackHistory, TrackMapping
from .utils.spotify_api import get_spotify_client
from .utils.spotify_status import spotify_status
from .utils.api_call import run_spotify_task
from app.data_import.workers.MergeWorker import merge_worker

class SpotifyWorker:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpotifyWorker, cls).__new__(cls)
            cls._instance.is_running = False
            cls._instance.repair_history = False
        return cls._instance

    async def repair_metadata(self):
        if not self.is_running: asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        self.is_running = True
        sp = get_spotify_client()
        
        with next(get_session()) as db:
            # Tant qu'il existe un track ou un artist qui ont provider Spotify ET qui ont duration_ms == NULL (pour track) ou image_url == NULL (pour artist)
            while self.is_running:
                status = spotify_status.get_status()
                # Si on est blacklist à l'heure actuelle
                if status["is_rate_limited"]:
                    await asyncio.sleep(status["retry_after_seconds"] + 1)
                    continue

                try:
                    # --- TRAITEMENT DES TRACKS ---
                    tracks_ended = False
                    processed = 0
                    while not tracks_ended:
                        # 50 Track dont le duration_ms == NULL ET qui ont un provider SPOTIFY
                        tracks_to_repair = db.exec(
                            select(Track, TrackMapping.provider_id)
                            .join(TrackMapping)
                            .where(TrackMapping.provider == MusicProvider.SPOTIFY)
                            .where(Track.duration_ms == None)
                            .limit(50)
                        ).all()
                        if tracks_to_repair:
                            results = (await run_spotify_task(sp.tracks,[t[1] for t in tracks_to_repair]))['tracks']
                            for (track, _), t in zip(tracks_to_repair, results):
                                if t: self._update_track_metadata(db, t)
                                if track.duration_ms is None:
                                    # ID inconnu (ou renvoyé sous un autre ID) : on renseigne la durée pour ne pas la redemander en boucle
                                    track.duration_ms = (t or {}).get('duration_ms') or 0
                                    db.add(track)
                                    db.flush()
                                processed += 1
                            if processed % 500 == 0: db.commit()
                        else:
                            db.commit()
                            tracks_ended = True
                    
                    # --- TRAITEMENT DES ARTISTES ---
                    artists_ended = False
                    processed = 0
                    while not artists_ended:
                        # 50 Artist dont le image_url == NULL ET qui ont un provider SPOTIFY
                        artists_to_repair = db.exec(
                            select(Artist, ArtistMapping.provider_id)
                            .join(ArtistMapping, Artist.id == ArtistMapping.artist_id)
                            .where(ArtistMapping.provider == MusicProvider.SPOTIFY)
                            .where(ArtistMapping.provider_id.not_like("name_%"))
                            .where(Artist.image_url == None)
                            .distinct()
                            .limit(50)
                        ).all()
                        if artists_to_repair:
                            results = (await run_spotify_task(sp.artists,[a[1] for a in artists_to_repair]))['artists']
                            for (artist, _), a in zip(artists_to_repair, results):
                                if a: self._update_artist_metadata(db, a)
                                else:
                                    # ID inconnu de Spotify : même marqueur que "pas d'image" pour sortir de la file
                                    artist.image_url = "none"
                                    db.add(artist)
                                    db.flush()
                                processed += 1
                            if processed % 500 == 0 or len(artists_to_repair) < 50: db.commit()
                        else:
                            db.commit()
                            artists_ended = True
                    # On arrête la boucle si on a rien dans la file d'attente
                    if not (tracks_to_repair or artists_to_repair): self.is_running = False
                except spotipy.exceptions.SpotifyException as e:
                    if e.http_status == 429:
                        # On récupère le temps d'attente suggéré par Spotify
                        seconds = int(e.headers.get("Retry-After", 60))
                        print(f"⚠️ Rate Limit atteint. Pause de {seconds}s")
                        # On met à jour le singleton d'état
                        spotify_status.set_rate_limited(seconds)
                        # On attend réellement avant de continuer la boucle
                        await asyncio.sleep(seconds)
                    else: print(f"❌ Erreur API Spotify: {e}")
                except Exception as e:
                    print(f"❌ Erreur Worker inattendue: {e}")
                    db.rollback()
            
        # Lancer une correction de doublons
        await merge_worker.merge_repair()

    def _update_track_metadata(self, db: Session, t: dict):
        """
        Prend un objet track de l'API Spotify et met à jour les entrées correspondantes dans la DB.
        """
        # 1. Extraction des IDs Spotify (Provider IDs)
        sp_track_id = t['id']
        sp_artist_id = t['artists'][0]['id']
        sp_album_id = t['album']['id']

        # Données de contenu
        sp_album_name = t['album']['name']
        sp_artist_name = t['artists'][0]['name']
        duration_ms = t['duration_ms']
        sp_album_img = t['album']['images'][0]['url'] if t['album']['images'] else None

        # --- GESTION DE L'ARTISTE ---
        # On cherche si cet artiste Spotify existe déjà dans nos mappings
        artist_mapping = db.exec(
            select(ArtistMapping).where(
                ArtistMapping.provider == MusicProvider.SPOTIFY,
                ArtistMapping.provider_id == sp_artist_id
            )
        ).first()

        if artist_mapping: artist_id = artist_mapping.artist_id
        else:
            # Création d'un nouvel artiste propre
            new_artist = Artist(name=sp_artist_name)
            db.add(new_artist)
            db.flush() # Pour avoir l'ID
            artist_id = new_artist.id
            # Création du mapping officiel
            db.add(ArtistMapping(
                provider=MusicProvider.SPOTIFY,
                provider_id=sp_artist_id,
                artist_id=artist_id
            ))

        # --- GESTION DE L'ALBUM ---
        # On cherche si cet album Spotify existe déjà
        album_mapping = db.exec(
            select(AlbumMapping).where(
                AlbumMapping.provider == MusicProvider.SPOTIFY,
                AlbumMapping.provider_id == sp_album_id
            )
        ).first()

        if album_mapping:
            album_id = album_mapping.album_id
            # Mise à jour de l'image si elle a changé ou était vide
            album = db.get(Album, album_id)
            if album and sp_album_img:
                album.image_url = sp_album_img
                db.add(album)
        else:
            # Création du nouvel album lié à l'artiste identifié au-dessus
            new_album = Album(
                name=sp_album_name,
                artist_id=artist_id,
                image_url=sp_album_img
            )
            db.add(new_album)
            db.flush()
            album_id = new_album.id
            # Création du mapping officiel
            db.add(AlbumMapping(
                provider=MusicProvider.SPOTIFY,
                provider_id=sp_album_id,
                album_id=album_id
            ))

        # --- MISE À JOUR DE LA TRACK ---
        # On récupère la track qui a déclenché ce besoin de réparation
        track_mapping = db.exec(
            select(TrackMapping).where(
                TrackMapping.provider == MusicProvider.SPOTIFY,
                TrackMapping.provider_id == sp_track_id
            )
        ).first()

        if track_mapping:
            track = db.get(Track, track_mapping.track_id)
            if track:
                track.duration_ms = duration_ms
                track.artist_id = artist_id
                track.album_id = album_id
                db.add(track)
                db.flush()

                stmt = (
                    update(TrackHistory)
                    .where(TrackHistory.track_id == track.id)
                    .where((TrackHistory.artist_id == None) | (TrackHistory.album_id == None))
                    .values(artist_id=artist_id, album_id=album_id)
                )
                db.exec(stmt)

    def _update_artist_metadata(self, db: Session, sp_artist: dict):
        """
        Prend un objet artist de l'API Spotify et met à jour les entrées correspondantes dans la DB.
        """
        artist = db.exec(select(Artist).join(ArtistMapping).where(
            ArtistMapping.provider == MusicProvider.SPOTIFY,
            ArtistMapping.provider_id == sp_artist['id'])
        ).first()
        if artist:
            if sp_artist.get('images') and len(sp_artist['images']) > 0:
                artist.image_url = sp_artist['images'][0]['url']
            else: 
                artist.image_url = "none" 
            db.add(artist)
            db.flush()

spotify_worker = SpotifyWorker()