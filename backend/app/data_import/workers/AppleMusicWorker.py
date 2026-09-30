import asyncio
from sqlalchemy import update
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Album, AlbumMapping, Artist, ArtistMapping, CreateRequest, MergeEntityType, MergeRequest, MergeStatus, MusicProvider, Track, TrackHistory, TrackMapping
from .musicbrainz.utils.api_call import run_musicbrainz_task
from .musicbrainz.MusicBrainzWorker import get_musicbrainz_client
from .MergeWorker import merge_worker
from .spotify.utils.spotify_api import get_spotify_client
from .spotify.utils.api_call import run_spotify_task
import re

class AppleMusicWorker:
    _instance = None
    BANNED_ALBUMS = [
        "MuchDance", "Planète Rap", "Girls Night Hits", "Tinderbox Festival",
        "Newark", "Lollapalooza Chile", "Club Sounds - Best of", 
        "The Annual", "Crooklyn Clan Presents"
    ]

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AppleMusicWorker, cls).__new__(cls)
            cls._instance.is_running = False
        return cls._instance

    async def repair_metadata(self):
        if not self.is_running: asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        self.is_running = True
        
        with next(get_session()) as db:
            while self.is_running:
                track_to_repair = None
                try:
                    # 1. RÉCUPÉRATION : On cherche les tracks non traitées (None) 
                    # ou celles en échec MusicBrainz (-1) pour tenter le cache local
                    track_to_repair = db.exec(
                        select(Track)
                        .join(TrackMapping)
                        .where(TrackMapping.provider == MusicProvider.APPLE_MUSIC)
                        .where((Track.artist_id == None) | (Track.artist_id == -1))
                        .order_by(Track.artist_id.desc()) # Traite les NULL d'abord
                        .limit(1)
                    ).first()

                    if not track_to_repair:
                        print("🏁 Fin du traitement : plus de pistes à réparer.")
                        self.is_running = False
                        break

                    full_title = track_to_repair.title or "Unknown"
                    artist_name, song_name = self._get_parts(full_title)

                    # res = await self._search_recording_by_musicbrainz(db, track_to_repair, artist_name, song_name)
                    suggestions = await self._get_spotify_suggestions(song_name, artist_name, track_to_repair.duration_ms)

                    if not suggestions:
                        print(f"❌ Aucun match Spotify pour {song_name}")
                        track_to_repair.artist_id = -2 # Introuvable
                        db.add(track_to_repair)
                        db.commit()
                        continue

                    # 3. ANALYSE DES RÉSULTATS
                    # Si on a un seul résultat et qu'il est très proche en durée
                    if len(suggestions) == 1:
                        print(f"🚀 Auto-certification Spotify : {song_name}")
                        self._apply_spotify_metadata(db, track_to_repair, suggestions[0])
                        db.commit()
                    else:
                        # Ambiguité -> Manuel
                        print(f"📝 Ambiguité Spotify ({len(suggestions)} choix). Création Request.")
                        self._create_spotify_validation_request(db, track_to_repair, suggestions, reason=f"Ambiguité Spotify ({len(suggestions)} choix) pour {song_name}.")
                        db.commit()

                    db.expire_all()
                    # if res in [0, 1]:
                    #     db.expire_all()
                    #     continue

                    # if res == 3:
                    #     print("⏳ MusicBrainz saturé, pause...")
                    #     await asyncio.sleep(5)
                    #     break
                    # if res == 2:
                    #     # --- ÉTAPE 2 : VÉRIFICATION DANS LA DB LOCALE (CACHE) ---
                    #     # A. Tentative de match exact
                    #     existing_match = db.exec(
                    #         select(Track)
                    #         .join(Artist)
                    #         .where(func.lower(Track.title) == song_name.lower())
                    #         .where(func.lower(Artist.name) == artist_name.lower())
                    #         .where(Track.artist_id > 0)
                    #         .where(Track.id != track_to_repair.id)
                    #         .limit(1)
                    #     ).first()

                    #     # B. Si échec, tentative avec l'Artiste Principal uniquement
                    #     if not existing_match:
                    #         # On split sur les séparateurs courants : ",", "&", "feat", "x"
                    #         primary_artist = re.split(r'[,&]|\bfeat\b|\bx\b', artist_name, flags=re.IGNORECASE)[0].strip()
                            
                    #         if primary_artist.lower() != artist_name.lower():
                    #             print(f"🔍 Match exact échoué, tentative avec l'artiste principal : '{primary_artist}'")
                    #             existing_match = db.exec(
                    #                 select(Track)
                    #                 .join(Artist)
                    #                 .where(func.lower(Track.title) == song_name.lower())
                    #                 .where(func.lower(Artist.name) == primary_artist.lower())
                    #                 .where(Track.artist_id > 0)
                    #                 .where(Track.id != track_to_repair.id)
                    #                 .limit(1)
                    #             ).first()

                    #     # C. Si on a trouvé (via API ou DB), on merge
                    #     if existing_match:
                    #         print(f"♻️  Auto-merge : '{full_title}' rattaché à l'existant (ID:{existing_match.id})")
                    #         db.exec(update(TrackMapping).where(TrackMapping.track_id == track_to_repair.id).values(track_id=existing_match.id))
                    #         db.exec(update(TrackHistory).where(TrackHistory.track_id == track_to_repair.id).values(track_id=existing_match.id))
                    #         db.delete(track_to_repair)
                    #         db.commit()
                    #     else:
                    #         print(f"❌ Cache & MB échoués. Marquage définitif (-2).")
                    #         track_to_repair.artist_id = -2
                    #         db.add(track_to_repair)
                    #         db.commit()

                    # db.expire_all()
                except Exception as e:
                    print(f"⚠️ Erreur worker : {e}")
                    db.rollback()
                    await asyncio.sleep(5)
                
        # Lancer le MergeWorker pour nettoyer les albums/artistes doublons
        await merge_worker.merge_repair()

    # async def _search_recording_by_musicbrainz(self, db, track_to_repair, artist_name, song_name):
    #     mb_client = get_musicbrainz_client()
    #     clean_song_name = re.sub(r'[\(\[].*?[\)\]]', '', song_name).strip()
        
    #     # 1. COLLECTE
    #     print(f"📡 MB Recherche : '{song_name}' par '{artist_name}'")
    #     data = await run_musicbrainz_task(mb_client.get_recording_by_search, song_name, artist_name)
    #     if data == "RATE_LIMIT": return 3
    #     search_results = data.get("recordings", []) if isinstance(data, dict) else (data or [])
        
    #     # 2. FILTRAGE DE QUALITÉ
    #     filtered_results = []
    #     for rec in search_results:
    #         duration = rec.get('length')
    #         releases = rec.get('releases', [])
    #         if not duration and not releases: continue
            
    #         is_banned = False
    #         for rel in releases:
    #             album_title = rel.get('title', '')
    #             if any(banned.lower() in album_title.lower() for banned in self.BANNED_ALBUMS):
    #                 is_banned = True
    #                 break
    #         if not is_banned: filtered_results.append(rec)

    #     if not filtered_results: 
    #         return 2 # Aucun résultat après filtres -> Go Cache Local

    #     # 3. TENTATIVE D'AUTO-CERTIFICATION (Spotify)
    #     certified_mb_match = await self._get_spotify_data(song_name, artist_name, mb_results=filtered_results)
    #     if certified_mb_match:
    #         print(f"🚀 Certification réussie (Spotify) ! Auto-application.")
    #         self._apply_metadata(db, track_to_repair, certified_mb_match)
    #         return 0

    #     # 4. MATCH UNIQUE PARFAIT (Sans nettoyage de titre)
    #     exact_matches = [
    #         r for r in filtered_results 
    #         if r.get('title', '').lower().strip() == song_name.lower().strip()
    #     ]

    #     # On auto-applique seulement si le titre est "propre" (non nettoyé) ET unique
    #     if len(exact_matches) == 1 and clean_song_name.lower() == song_name.lower():
    #         print(f"🎯 Match unique parfait (MusicBrainz). Auto-application.")
    #         self._apply_metadata(db, track_to_repair, exact_matches[0])
    #         return 0

    #     # 5. TOUT LE RESTE -> VALIDATION ADMIN (Code 1)
    #     # Si on a des résultats mais qu'on a un doute (plusieurs choix ou titre nettoyé)
    #     print(f"📝 {len(filtered_results)} suggestions trouvées. Création d'une CreateRequest.")
    #     reason = f"Validation nécessaire : {len(filtered_results)} correspondances trouvées"
    #     if clean_song_name.lower() != song_name.lower():
    #         reason += f" (Titre nettoyé : '{song_name}' -> '{clean_song_name}')"
            
    #     self._create_validation_request(db, track_to_repair, filtered_results, reason=reason)
    #     return 1

    # async def _get_spotify_data(self, song_name, artist_name, mb_results=None):
    #     sp = get_spotify_client()
    #     try:
    #         query = f"track:{song_name} artist:{artist_name}"
    #         # On passe par run_spotify_task pour l'async/rate limit
    #         res = await run_spotify_task(sp.search, q=query, limit=10, type='track')
    #         tracks = res['tracks'].get('items', [])
    #         if not tracks: return None

    #         for sp_track in tracks:
    #             sp_title = sp_track['name'].lower()
    #             sp_artist = sp_track['artists'][0]['name'].lower()
    #             sp_duration = sp_track['duration_ms']

    #             # On vérifie la correspondance textuelle basique
    #             title_match = song_name.lower() in sp_title or sp_title in song_name.lower()
    #             artist_match = artist_name.lower() in sp_artist or sp_artist in artist_name.lower()

    #             if title_match and artist_match:
    #                 # Comparaison avec les résultats MusicBrainz fournis
    #                 if mb_results:
    #                     for mb in mb_results:
    #                         mb_len = mb.get('length')
    #                         # Si la durée concorde à +/- 2 secondes
    #                         if mb_len and abs(int(mb_len) - sp_duration) < 2000:
    #                             # On injecte l'ID Spotify pour le mapping
    #                             mb['spotify_id'] = sp_track['id']
    #                             # On injecte aussi l'ISRC si dispo
    #                             if 'external_ids' in sp_track and 'isrc' in sp_track['external_ids']:
    #                                 if 'isrcs' not in mb: mb['isrcs'] = []
    #                                 mb['isrcs'].append(sp_track['external_ids']['isrc'])
    #                             return mb
    #         return None
    #     except Exception as e:
    #         print(f"⚠️ Erreur API Spotify : {e}")
    #         return None

    async def _get_spotify_suggestions(self, song_name, artist_name, target_duration_ms):
        sp = get_spotify_client()
        query = f"track:{song_name} artist:{artist_name}"
        
        try:
            res = await run_spotify_task(sp.search, q=query, limit=1, type='track')
            items = res['tracks'].get('items', [])
            
            valid_suggestions = []
            for item in items:
                # Filtre de sécurité : la durée doit être cohérente (+/- 3 secondes)
                # C'est ce qui évite de confondre un Single avec une version Extended
                if target_duration_ms and abs(item['duration_ms'] - target_duration_ms) > 3000: continue
                    
                # On reformate l'objet pour qu'il soit compatible avec ton Front
                valid_suggestions.append({
                    "id": item['id'],
                    "title": item['name'],
                    "artist": item['artists'][0]['name'],
                    "artist_id": item['artists'][0]['id'],
                    "album": item['album']['name'],
                    "album_id": item['album']['id'],
                    "image_url": item['album']['images'][0]['url'] if item['album']['images'] else None,
                    "duration_ms": item['duration_ms'],
                    "isrc": item.get('external_ids', {}).get('isrc'),
                    "release_date": item['album'].get('release_date')
                })
                
            return valid_suggestions
        except Exception: return []

    # def _create_validation_request(self, db, track, matches, reason):
    #     """Utilitaire pour créer la CreateRequest proprement"""
    #     new_cr = CreateRequest(
    #         track_id=track.id,
    #         match_data={"suggestions": matches}, # On stocke la liste ici
    #         reason=reason
    #     )
    #     track.artist_id = -3
    #     db.add(new_cr)
    #     db.add(track)
    #     db.commit()

    def _create_spotify_validation_request(self, db: Session, track: Track, suggestions: list, reason: str):
        """
        Crée une CreateRequest basée sur les suggestions Spotify.
        Le track est marqué artist_id = -3 pour ne pas être re-traité par le worker
        tant que l'admin n'a pas choisi.
        """
        try:
            # Création de la requête avec le nouveau format de données Spotify
            new_cr = CreateRequest(
                track_id=track.id,
                match_data={"suggestions": suggestions}, 
                reason=reason
            )
            
            # -3 = "En attente de choix manuel Spotify"
            track.artist_id = -3
            
            db.add(new_cr)
            db.add(track)
            
            # On commit ici pour libérer la ligne en DB et la rendre visible sur l'admin
            db.commit()
            print(f"📦 CreateRequest créée pour '{track.title}' (ID: {track.id}) avec {len(suggestions)} suggestions Spotify.")
            
        except Exception as e:
            print(f"⚠️ Erreur lors de la création de la validation request : {e}")
            db.rollback()
            raise e

    def _get_parts(self, full_title: str):
        parts = full_title.split(" - ")
        artist_name = ""
        song_name = full_title
        
        if len(parts) >= 2:
            artist_name = parts[0].strip()
            song_name = " - ".join(parts[1:]).strip()
        return artist_name, song_name

    # def _apply_metadata(self, db: Session, track: Track, mb_data: dict):
    #     """
    #     Applique les métadonnées : 
    #     - Track (duration_ms, artist_id, album_id)
    #     - Artist (name, imageUrl via MusicBrainz ID)
    #     - Album (name, imageUrl, artist_id)
    #     - TrackMapping (ISRC, Provider MusicBrainz)
    #     - TrackHistory (Mise à jour globale artist_id, album_id)
    #     """
    #     # GESTION DE L'ARTISTE
    #     artist_credits = mb_data.get("artist-credit", [{}])
    #     main_artist_data = artist_credits[0].get("artist", {})
    #     artist_name = main_artist_data.get("name", "Unknown Artist")
    #     mb_uuid = main_artist_data.get("id")
    #     active_artist = self._get_or_create_artist(db, artist_name, mb_uuid)
    #     if not active_artist:
    #         print("❌ Critique: Pas d'artiste récupéré")
    #         return
    #     print("✅ Artist check terminé")

    #     # GESTION DE L'ALBUM
    #     active_album = None
    #     releases = mb_data.get("releases", [])
    #     if releases:
    #         album_name_from_mb = releases[0].get("title")
    #         if album_name_from_mb: active_album = self._get_or_create_album(db, album_name_from_mb, active_artist.id)
    #     print("✅ Album check terminé")

    #     # MISE À JOUR DE LA TRACK
    #     if mb_data.get("length"): track.duration_ms = int(mb_data.get("length"))
    #     track.title = mb_data.get("title", track.title)
    #     track.artist_id = active_artist.id
    #     if active_album: track.album_id = active_album.id
    #     db.add(track)
    #     db.flush()
    #     print("✅ Track flushée")
        
    #     # CRÉATION DU MAPPING ISRC
    #     isrc_list = mb_data.get("isrcs", [])
    #     if isrc_list: self._add_isrc_mapping(db, track.id, isrc_list[0])

    #     # MISE À JOUR DES TRACKHISTORY
    #     db.exec(
    #         update(TrackHistory)
    #         .where(TrackHistory.track_id == track.id)
    #         .values(
    #             artist_id=active_artist.id, 
    #             album_id=active_album.id if active_album else None
    #         )
    #     )
    #     print("✅ TrackHistory mis à jour")

    def _apply_spotify_metadata(self, db: Session, track: Track, sp_data: dict):
        """
        Applique les métadonnées provenant de Spotify :
        - Track (duration_ms, artist_id, album_id, title)
        - Artist (get_or_create via Spotify Artist Name)
        - Album (get_or_create via Spotify Album Name)
        - Mapping (ISRC et Spotify ID)
        - TrackHistory (Migration globale)
        """
        # 1. GESTION DE L'ARTISTE
        # sp_data['artist'] contient le nom de l'artiste principal
        artist_name = sp_data.get("artist", "Unknown Artist")
        sp_art_id = sp_data.get("artist_id")
        active_artist = self._get_or_create_artist(db, artist_name, sp_art_id) 
        
        if not active_artist:
            print(f"❌ Erreur critique : Impossible de créer l'artiste {artist_name}")
            return
        print(f"✅ Artiste validé : {active_artist.name}")

        # 2. GESTION DE L'ALBUM
        active_album = None
        album_name = sp_data.get("album")
        album_id = sp_data.get("album_id")
        if album_name:
            active_album = self._get_or_create_album(
                db, 
                album_name,
                album_id,
                active_artist.id,
                image_url=sp_data.get("image_url")
            )
        print(f"✅ Album validé : {album_name}")

        # 3. MISE À JOUR DE LA TRACK
        # Spotify donne la durée en ms, on met à jour si dispo
        if sp_data.get("duration_ms"): track.duration_ms = sp_data["duration_ms"]
        
        # On met à jour le titre avec le nom propre de Spotify
        track.title = sp_data.get("title", track.title)
        track.artist_id = active_artist.id
        if active_album: track.album_id = active_album.id
        
        db.add(track)
        db.flush() # Pour figer les IDs avant les mappings

        # 4. MAPPINGS (ISRC & Spotify ID)
        # On ajoute l'ISRC si présent
        if sp_data.get("isrc"): self._add_track_mapping(db, track.id, MusicProvider.ISRC, sp_data["isrc"])
        
        # On ajoute l'ID Spotify pour éviter de refaire la recherche plus tard
        if sp_data.get("id"): self._add_track_mapping(db, track.id, MusicProvider.SPOTIFY, sp_data["id"])

        # 5. MISE À JOUR DE L'HISTORIQUE
        # On rattache toutes les écoutes passées au nouvel artiste/album
        db.exec(
            update(TrackHistory)
            .where(TrackHistory.track_id == track.id)
            .values(
                artist_id=active_artist.id, 
                album_id=active_album.id if active_album else None
            )
        )
        
        print(f"✅ Métadonnées Spotify appliquées avec succès pour {track.title}")
        
    # def _get_or_create_album(self, db: Session, album_name: str, artist_id: int) -> Album:
    #     """
    #     Cherche l'album par name et artist_id.
    #     """
    #     album = db.exec(
    #         select(Album).where(
    #             Album.artist_id == artist_id,
    #             Album.name == album_name
    #         )
    #     ).first()

    #     if not album:
    #         album = Album(
    #             name=album_name,
    #             artist_id=artist_id,
    #             image_url=None
    #         )
    #         db.add(album)
    #         db.flush()
        
    #     return album

    def _get_or_create_album(self, db: Session, name: str, sp_album_id: str, artist_id: int, image_url: str = None) -> Album:
        """
        Cherche l'album via son ID Spotify (Mapping) ou par son nom/artiste.
        """
        album = None

        # A. Recherche par ID Spotify (via AlbumMapping ou directement via le champ si tu en as un)
        # Si tu as une table AlbumMapping (recommandé pour la cohérence) :
        if sp_album_id:
            # Note: On suppose ici que tu as créé un provider 'SPOTIFY' dans ton enum MusicProvider
            # et que tu as une table/logique pour les mappings d'albums
            album = db.exec(
                select(Album)
                .join(AlbumMapping, Album.id == AlbumMapping.album_id)
                .where(AlbumMapping.provider == MusicProvider.SPOTIFY)
                .where(AlbumMapping.provider_id == sp_album_id)
            ).first()

        # B. Recherche par Nom + Artiste (Fallback si le mapping n'existe pas encore)
        if not album:
            album = db.exec(
                select(Album)
                .where(func.lower(Album.name) == name.lower())
                .where(Album.artist_id == artist_id)
            ).first()

        # C. Création si l'album n'existe pas du tout
        if not album:
            album = Album(
                name=name,
                artist_id=artist_id,
                image_url=image_url # On injecte l'image Spotify dès la création
            )
            db.add(album)
            db.flush() # Récupère l'ID pour le mapping
            print(f"💿 Nouvel album créé : '{name}'")
            
            # D. Création du mapping pour l'album
            if sp_album_id:
                new_mapping = AlbumMapping(
                    album_id=album.id,
                    provider=MusicProvider.SPOTIFY,
                    provider_id=sp_album_id
                )
                db.add(new_mapping)

        # E. Mise à jour de l'image (si l'album existait mais n'avait pas d'image)
        elif image_url and not album.image_url:
            album.image_url = image_url
            db.add(album)
            print(f"🖼️ Image ajoutée pour l'album existant : '{name}'")

        return album

    # def _add_isrc_mapping(self, db: Session, track_id: int, isrc_value: str):
    #     """
    #     Ajoute un mapping ISRC s'il n'existe pas déjà pour ce track.
    #     """
    #     existing = db.exec(
    #         select(TrackMapping).where(
    #             TrackMapping.track_id == track_id,
    #             TrackMapping.provider == MusicProvider.ISRC,
    #             TrackMapping.provider_id == isrc_value
    #         )
    #     ).first()

    #     if not existing:
    #         new_mapping = TrackMapping(
    #             track_id=track_id,
    #             provider=MusicProvider.ISRC,
    #             provider_id=isrc_value
    #         )
    #         db.add(new_mapping)

    def _add_track_mapping(self, db: Session, track_id: int, provider: MusicProvider, provider_id: str):
        """
        Ajoute un mapping (ISRC, Spotify, etc.) à une track s'il n'existe pas déjà.
        """
        if not provider_id:
            return

        # Vérification de l'existence pour éviter les doublons
        existing = db.exec(
            select(TrackMapping).where(
                TrackMapping.track_id == track_id,
                TrackMapping.provider == provider,
                TrackMapping.provider_id == provider_id
            )
        ).first()

        if not existing:
            new_mapping = TrackMapping(
                track_id=track_id,
                provider=provider,
                provider_id=provider_id
            )
            db.add(new_mapping)
            # On ne flush pas forcément ici, le flush global de _apply_metadata suffira
            print(f"🔗 Mapping ajouté : {provider} -> {provider_id}")

    def _add_artist_mapping(self, db: Session, artist_id: int, provider: MusicProvider, provider_id: str):
        existing = db.exec(
            select(ArtistMapping).where(
                ArtistMapping.artist_id == artist_id,
                ArtistMapping.provider == provider,
                ArtistMapping.provider_id == provider_id
            )
        ).first()

        if not existing:
            db.add(ArtistMapping(
                artist_id=artist_id,
                provider=provider,
                provider_id=provider_id
            ))
    
    def _add_album_mapping(self, db: Session, album_id: int, provider: MusicProvider, provider_id: str):
        # Même logique que pour l'artiste
        existing = db.exec(
            select(AlbumMapping).where(
                AlbumMapping.album_id == album_id,
                AlbumMapping.provider == provider,
                AlbumMapping.provider_id == provider_id
            )
        ).first()

        if not existing:
            db.add(AlbumMapping(
                album_id=album_id,
                provider=provider,
                provider_id=provider_id
            ))

    def _get_or_create_artist(self, db: Session, name: str, uuid: str) -> Artist:
        existing_id = db.exec(
            select(ArtistMapping.artist_id).where(ArtistMapping.provider_id == uuid)
        ).first()

        if existing_id:
            artist = db.get(Artist, existing_id)
            if artist: return artist

        new_artist = Artist(name=name)
        db.add(new_artist)
        db.flush()

        new_mapping = ArtistMapping(
            artist_id=new_artist.id,
            provider=MusicProvider.SPOTIFY,
            provider_id=uuid
        )
        db.add(new_mapping)
        db.flush()

        return new_artist

apple_music_worker = AppleMusicWorker()