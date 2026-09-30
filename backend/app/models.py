from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from sqlalchemy import JSON, Column, ForeignKey, Integer, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

# --- ENUMS ---

class MusicProvider(str, Enum):
    SPOTIFY = "SPOTIFY"
    APPLE_MUSIC = "APPLE_MUSIC"
    ISRC = "ISRC"
    MUSICBRAINZ = "MUSICBRAINZ"

class MergeEntityType(str, Enum):
    ARTIST = "ARTIST"
    ALBUM = "ALBUM"
    TRACK = "TRACK"

class MergeStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

# --- UTILISATEURS & COMPTES ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True) 
    password_hash: Optional[str] = Field(default=None)
    display_name: str
    # --- PROFIL & PERMS ---
    slug: Optional[str] = Field(default=None, unique=True, index=True)
    avatar_url: Optional[str] = Field(default=None, sa_column=Column(Text))
    banner_url: Optional[str] = Field(default=None, sa_column=Column(Text))
    bio: Optional[str] = Field(default=None, max_length=500)
    perms: Dict[str, bool] = Field(
        default={"profile": True, "stats": True, "favorites": True, "history": True, "dashboard": True},
        sa_column=Column(JSON)
    )
    isadmin: bool = Field(default=False)
    # --- SESSION ---
    session_id: Optional[str] = Field(default=None, index=True)
    # --- RELATIONS ---
    accounts: List["UserAccount"] = Relationship(back_populates="user", cascade_delete=True) # Comptes Spotify/Apple Music
    history: List["TrackHistory"] = Relationship(back_populates="user", cascade_delete=True)

class UserAccount(SQLModel, table=True):
    # Un compte externe ne peut être lié qu'à un seul utilisateur
    __table_args__ = (UniqueConstraint("provider", "provider_user_id", name="uq_useraccount_provider_user"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = Field(index=True)  # "spotify" ou "apple_music"
    # ID spécifique au service (ex: spotify_id ou apple_id)
    provider_user_id: str = Field(index=True)
    provider_email: Optional[str] = Field(default=None)
    # Tokens & Sessions
    access_token: Optional[str] = Field(default=None)
    refresh_token: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    # Clé étrangère
    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="accounts")

# --- ENTITÉS MUSICALES (CORE) ---

class Artist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    image_url: Optional[str] = None
    # Relations internes
    albums: List["Album"] = Relationship(back_populates="artist")
    tracks: List["Track"] = Relationship(back_populates="artist")
    history: List["TrackHistory"] = Relationship(back_populates="artist")
    # Mapping vers Spotify / Apple / etc.
    mappings: List["ArtistMapping"] = Relationship(back_populates="artist")

class Album(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    image_url: Optional[str] = None
    artist_id: int = Field(foreign_key="artist.id")
    # Relations
    artist: Artist = Relationship(back_populates="albums")
    tracks: List["Track"] = Relationship(back_populates="album")
    history: List["TrackHistory"] = Relationship(back_populates="album")
    # Mapping vers Spotify / Apple / etc.
    mappings: List["AlbumMapping"] = Relationship(back_populates="album")

class Track(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    duration_ms: Optional[int] = None
    artist_id: Optional[int] = Field(default=None, foreign_key="artist.id")
    album_id: Optional[int] = Field(default=None, foreign_key="album.id")
    # --- RELATIONS ---
    artist: Artist = Relationship(back_populates="tracks")
    album: Album = Relationship(back_populates="tracks")
    history: List["TrackHistory"] = Relationship(back_populates="track")
    mappings: List["TrackMapping"] = Relationship(back_populates="track")

# --- HISTORIQUE D'ÉCOUTES ---

class TrackHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(index=True)
    ms_played: int
    provider: MusicProvider = Field(index=True) # Pour savoir si ça vient d'Apple ou Spotify
    # --- LES CLÉS ÉTRANGÈRES (Pointent vers les IDs internes int) ---
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    track_id: int = Field(foreign_key="track.id", index=True)
    artist_id: Optional[int] = Field(default=None, foreign_key="artist.id", index=True)
    album_id: Optional[int] = Field(default=None, foreign_key="album.id", index=True)
    # --- RELATIONS ---
    user: User = Relationship(back_populates="history")
    track: Track = Relationship(back_populates="history")
    album: Optional["Album"] = Relationship(back_populates="history")
    artist: Optional["Artist"] = Relationship(back_populates="history")
    model_config = {"arbitrary_types_allowed": True}

# --- MAPPINGS (TRADUCTEURS D'IDS EXTERNES) ---

class ArtistMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: MusicProvider = Field(index=True)
    provider_id: str = Field(index=True)
    artist_id: int = Field(foreign_key="artist.id")
    artist: Artist = Relationship(back_populates="mappings")

class AlbumMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: MusicProvider = Field(index=True)
    provider_id: str = Field(index=True)
    album_id: int = Field(foreign_key="album.id")
    album: Album = Relationship(back_populates="mappings")

class TrackMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: MusicProvider = Field(index=True)
    provider_id: str = Field(index=True)
    track_id: int = Field(foreign_key="track.id")
    track: Track = Relationship(back_populates="mappings")

# --- ADMIN AND VERIFY REQUESTS ---

class MergeRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # --- CONFIGURATION ---
    entity_type: MergeEntityType = Field(index=True)
    status: MergeStatus = Field(default=MergeStatus.PENDING, index=True)
    priority: str = Field(default="medium") # "low", "medium", "high"
    
    # --- LES DEUX PROTAGONISTES ---
    # L'ID de l'élément qui sera supprimé
    duplicate_id: int = Field(index=True)
    # L'ID de l'élément qui recevra les données
    target_id: int = Field(index=True)
    
    # --- METADONNÉES ---
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Raison ou commentaire (ex: "Doublon créé par l'import Spotify")
    reason: Optional[str] = Field(default=None, max_length=500)

class CreateRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    track_id: int
    match_data: dict = Field(default={}, sa_type=JSON)
    # --- METADONNÉES ---
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Raison ou commentaire (ex: "Incertitude de la création")
    reason: Optional[str] = Field(default=None, max_length=500)