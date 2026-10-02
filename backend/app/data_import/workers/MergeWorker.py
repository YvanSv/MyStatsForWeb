import asyncio
from datetime import timedelta
from app.database import get_session
from sqlalchemy import text, func
from sqlmodel import Session, select, update, delete
from app.models import Artist, Album, Track, TrackHistory, ArtistMapping, AlbumMapping, TrackMapping

class MergeWorker:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MergeWorker, cls).__new__(cls)
            cls._instance.is_running = False
        return cls._instance

    async def merge_repair(self):
        if not self.is_running: asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        self.is_running = True
        
        with next(get_session()) as db:
            try:
                # Si deux artistes ont le même lowercase(name) et qu'ils ont un même lowercase(album_name) qui contient un même lowercase(track_title) qui a la même floor(duration_ms) : on merge les deux artistes
                # Si deux artistes ont la même image_url, on les merge
                await self.find_and_merge_artists(db)
                # Si deux albums ont le même lowercase(name) et les mêmes lowercase(artist_name) et qu'un de leur track a le même lowercase(track_title) qui a la même floor(duration_ms) : on merge les deux albums
                await self.find_and_merge_albums(db)
                # Si deux tracks ont le même lowercase(title) et que floor(duration_ms) est le même aussi et que lowercase(artist_name) est identique : on merge les deux tracks
                await self.find_and_merge_tracks(db)

                db.expire_all()

                # Réparation et split des trackhistory aglomérées en une seule
                await self.repair_durations_safe(db)

                # await self.find_duplicate_albums(db)
                # await self.find_and_merge_cross_platform_artists(db)
            except Exception as e: print(f"❌ Erreur générale MergeWorker : {e}")

        self.is_running = False
        print("🏁 MergeWorker : Scan terminé.")

    # --- LOGIQUE ARTISTES ---

    async def find_and_merge_artists(self, db: Session):
        print("🔍 Scan des Artistes doublons...")
        # On cherche les doublons par Nom+Album+Track OU par Image URL
        sql = text("""
            SELECT DISTINCT a1.id as master_id, a2.id as duplicate_id
            FROM artist a1
            JOIN artist a2 ON a1.id < a2.id
            WHERE 
                -- Cas 1 : Même nom (lowercase) + même album + même track + même durée floor
                (
                    LOWER(a1.name) = LOWER(a2.name)
                    AND EXISTS (
                        SELECT 1 FROM album al1 
                        JOIN album al2 ON LOWER(al1.name) = LOWER(al2.name)
                        JOIN track t1 ON t1.album_id = al1.id
                        JOIN track t2 ON t2.album_id = al2.id 
                            AND LOWER(t1.title) = LOWER(t2.title)
                            AND FLOOR(t1.duration_ms / 1000) = FLOOR(t2.duration_ms / 1000)
                        WHERE al1.artist_id = a1.id AND al2.artist_id = a2.id
                    )
                )
                OR 
                -- Cas 2 : Même image URL (non nulle)
                (a1.image_url IS NOT NULL AND a1.image_url = a2.image_url)
        """)
        results = db.execute(sql).fetchall()
        for row in results:
            await self.deep_merge_artists(db, row.master_id, row.duplicate_id)

    # --- LOGIQUE ALBUMS ---

    async def find_and_merge_albums(self, db: Session):
        print("🔍 Scan des Albums doublons...")
        # Même lowercase(name) + même artiste + au moins une track commune (nom + durée floor)
        sql = text("""
            SELECT DISTINCT al1.id as master_id, al2.id as duplicate_id
            FROM album al1
            JOIN album al2 ON al1.id < al2.id 
                AND LOWER(al1.name) = LOWER(al2.name) 
                AND al1.artist_id = al2.artist_id
            WHERE EXISTS (
                SELECT 1 FROM track t1 
                JOIN track t2 ON LOWER(t1.title) = LOWER(t2.title)
                    AND FLOOR(t1.duration_ms / 1000) = FLOOR(t2.duration_ms / 1000)
                WHERE t1.album_id = al1.id AND t2.album_id = al2.id
            )
        """)
        results = db.execute(sql).fetchall()
        for row in results:
            await self.merge_albums(db, row.master_id, row.duplicate_id)

    # --- LOGIQUE TRACKS ---

    async def find_and_merge_tracks(self, db: Session):
        print("🔍 Scan des Tracks doublons...")
        # Même lowercase(title) + même floor(duration) + même artiste
        sql = text("""
            SELECT DISTINCT t1.id as master_id, t2.id as duplicate_id
            FROM track t1
            JOIN track t2 ON t1.id < t2.id 
                AND LOWER(t1.title) = LOWER(t2.title)
                AND FLOOR(t1.duration_ms / 1000) = FLOOR(t2.duration_ms / 1000)
                AND t1.artist_id = t2.artist_id
        """)
        results = db.execute(sql).fetchall()
        for row in results:
            await self.merge_tracks(db, row.master_id, row.duplicate_id)

    # --- FONCTIONS DE FUSION RÉELLES (LES MOTEURS) ---

    async def deep_merge_artists(self, db: Session, master_id: int, duplicate_id: int):
        try:
            # Transfert des albums (si l'album existe déjà chez le master, on merge les albums)
            albums_to_move = db.exec(select(Album).where(Album.artist_id == duplicate_id)).all()
            for alb_dup in albums_to_move:
                existing = db.exec(select(Album).where(Album.artist_id == master_id, func.lower(Album.name) == func.lower(alb_dup.name))).first()
                if existing: await self.merge_albums(db, existing.id, alb_dup.id)
                else:
                    alb_dup.artist_id = master_id
                    db.add(alb_dup)

            # Redirection des liens directs (Tracks & History)
            db.exec(update(Track).where(Track.artist_id == duplicate_id).values(artist_id=master_id))
            db.exec(update(TrackHistory).where(TrackHistory.artist_id == duplicate_id).values(artist_id=master_id))
            db.exec(update(ArtistMapping).where(ArtistMapping.artist_id == duplicate_id).values(artist_id=master_id))
            
            db.exec(delete(Artist).where(Artist.id == duplicate_id))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"❌ Erreur merge artiste {duplicate_id}: {e}")

    async def merge_albums(self, db: Session, master_id: int, duplicate_id: int):
        try:
            # Transfert des tracks
            db.exec(update(Track).where(Track.album_id == duplicate_id).values(album_id=master_id))
            db.exec(update(TrackHistory).where(TrackHistory.album_id == duplicate_id).values(album_id=master_id))
            db.exec(update(AlbumMapping).where(AlbumMapping.album_id == duplicate_id).values(album_id=master_id))
            
            # Nettoyage des tracks doublons à l'intérieur de l'album master maintenant
            await self.find_and_merge_tracks(db) # On relance un scan de tracks localisé
            
            db.exec(delete(Album).where(Album.id == duplicate_id))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"❌ Erreur merge album {duplicate_id}: {e}")

    async def merge_tracks(self, db: Session, master_id: int, duplicate_id: int):
        try:
            db.exec(update(TrackMapping).where(TrackMapping.track_id == duplicate_id).values(track_id=master_id))
            db.exec(update(TrackHistory).where(TrackHistory.track_id == duplicate_id).values(track_id=master_id))
            db.exec(delete(Track).where(Track.id == duplicate_id))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"❌ Erreur merge track {duplicate_id}: {e}")

    async def repair_track_history_durations(self, session: Session):
        # 1. On récupère les historiques qui dépassent la durée de la track
        records_to_fix = session.exec(
            select(TrackHistory, Track)
            .join(Track, TrackHistory.track_id == Track.id)
            .where(Track.duration_ms > 0)
            .where(TrackHistory.ms_played > Track.duration_ms + 1000)
        ).all()

        print(f"🛠️ Analyse de {len(records_to_fix)} sessions d'écoutes trop longues...")

        for history, track in records_to_fix:
            original_total = history.ms_played
            track_len = track.duration_ms
            
            current_time = history.played_at
            remaining_duration = original_total
            
            # On ajuste la première écoute à la durée normale de la track
            history.ms_played = track_len
            session.add(history)
            remaining_duration -= track_len
            
            count = 0
            while remaining_duration >= track_len:
                # On décale le temps de lecture pour la nouvelle écoute 
                # (pour que les écoutes se suivent dans l'historique)
                current_time += timedelta(milliseconds=track_len)
                
                new_history = TrackHistory(
                    track_id=track.id,
                    user_id=history.user_id, # Important si multi-utilisateurs
                    played_at=current_time,
                    ms_played=track_len,
                    artist_id=history.artist_id,
                    album_id=history.album_id
                )
                session.add(new_history)
                
                remaining_duration -= track_len
                count += 1
                
            # Si après les découpes il reste un reliquat (ex: 20s sur une track de 3min)
            # On peut soit le jeter, soit l'ajouter comme une dernière écoute courte
            if remaining_duration > 10000: # Plus de 10 secondes restantes
                current_time += timedelta(milliseconds=track_len)
                extra_history = TrackHistory(
                    track_id=track.id,
                    user_id=history.user_id,
                    played_at=current_time,
                    ms_played=remaining_duration,
                    artist_id=history.artist_id,
                    album_id=history.album_id
                )
                session.add(extra_history)
                count += 1

            print(f"✅ Track '{track.title}': {original_total}ms découpé en {count + 1} écoutes.")

        session.commit()
        print("🚀 Réparation terminée.")
    
    async def repair_durations_safe(self, session: Session):
        try:
            statement = (
                select(TrackHistory, Track)
                .join(Track, TrackHistory.track_id == Track.id)
                .where(Track.duration_ms > 0)
                # On cible tout ce qui dépasse la durée de la track de plus de 10%
                .where(TrackHistory.ms_played > Track.duration_ms + 1000)
            )
            
            results = session.exec(statement).all()
            
            for history, track in results:
                if not track or not history: continue

                t_dur = track.duration_ms
                h_dur = history.ms_played
                
                # --- NOUVELLE LOGIQUE D'ARRONDI ---
                # Exemple: 150s / 100s = 1.5 -> On veut 2 écoutes
                # Exemple: 240s / 100s = 2.4 -> On veut 2 écoutes (la 3ème est trop courte)
                nb_ecoutes_reel = round(h_dur / t_dur)

                if nb_ecoutes_reel <= 1:
                    # Si on est entre 110% et 149%, on se contente de 
                    # "capé" l'écoute à la durée max de la track sans en créer de nouvelle
                    history.ms_played = t_dur
                    session.add(history)
                    continue

                print(f"✂️ Splitting '{track.title}': {h_dur}ms -> {nb_ecoutes_reel} écoutes")

                # 1. On ajuste la première écoute
                history.ms_played = t_dur
                session.add(history)

                # 2. On crée les N-1 écoutes supplémentaires
                for i in range(1, nb_ecoutes_reel):
                    # On répartit le temps restant. 
                    # Soit on met t_dur partout, soit on divise le reste.
                    # Le plus propre est de mettre t_dur.
                    new_played_at = history.played_at + timedelta(milliseconds=t_dur * i)
                    
                    new_history = TrackHistory(
                        track_id=track.id,
                        user_id=history.user_id,
                        played_at=new_played_at,
                        ms_played=t_dur, 
                        artist_id=track.artist_id,
                        album_id=track.album_id,
                        provider = history.provider
                    )
                    session.add(new_history)

            session.commit()
            print("✅ Réparation des durées (Arrondi) terminée.")

        except Exception as e:
            session.rollback()
            print(f"❌ Erreur : {e}")

merge_worker = MergeWorker()