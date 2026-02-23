from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # --- IDENTITÉ (Email de connexion) ---
    # C'est l'email utilisé pour le login classique
    email: str = Field(index=True, unique=True) 
    password_hash: Optional[str] = Field(default=None)
    display_name: str
    # --- LIEN SPOTIFY (Email technique Spotify) ---
    # On stocke l'email renvoyé par Spotify ici. 
    # Il peut être différent de l'email ci-dessus.
    spotify_email: Optional[str] = Field(default=None) 
    spotify_id: Optional[str] = Field(default=None, index=True, unique=True)
    # Tokens et sessions
    session_id: Optional[str] = Field(default=None, index=True)
    refresh_token: Optional[str] = Field(default=None)
    access_token: Optional[str] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)

    history: List["TrackHistory"] = Relationship(back_populates="user")

class Artist(SQLModel, table=True):
    spotify_id: str = Field(primary_key=True)
    name: str
    image_url: Optional[str] = None
    
    albums: List["Album"] = Relationship(back_populates="artist")
    tracks: List["Track"] = Relationship(back_populates="artist")

class Album(SQLModel, table=True):
    spotify_id: str = Field(primary_key=True)
    name: str
    image_url: Optional[str] = None
    
    artist_id: str = Field(foreign_key="artist.spotify_id")
    artist: Artist = Relationship(back_populates="albums")
    tracks: List["Track"] = Relationship(back_populates="album")

class Track(SQLModel, table=True):
    spotify_id: str = Field(primary_key=True)
    title: str
    duration_ms: Optional[int] = None
    
    artist_id: Optional[str] = Field(foreign_key="artist.spotify_id")
    album_id: Optional[str] = Field(foreign_key="album.spotify_id")
    
    artist: Artist = Relationship(back_populates="tracks")
    album: Album = Relationship(back_populates="tracks")
    history: List["TrackHistory"] = Relationship(back_populates="track")

class TrackHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(index=True)
    ms_played: int
    
    user_id: int = Field(foreign_key="user.id")
    spotify_id: str = Field(foreign_key="track.spotify_id")
    
    user: User = Relationship(back_populates="history")
    track: Track = Relationship(back_populates="history")