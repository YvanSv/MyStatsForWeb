from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    spotify_id: str = Field(index=True, unique=True)
    display_name: str
    email: str
    session_id: Optional[str] = Field(default=None, index=True)
    refresh_token: str
    access_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    
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
    duration_ms: int
    
    artist_id: str = Field(foreign_key="artist.spotify_id")
    album_id: str = Field(foreign_key="album.spotify_id")
    
    artist: Artist = Relationship(back_populates="tracks")
    album: Album = Relationship(back_populates="tracks")
    history: List["TrackHistory"] = Relationship(back_populates="track")

class TrackHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(index=True)
    
    user_id: int = Field(foreign_key="user.id")
    spotify_id: str = Field(foreign_key="track.spotify_id")
    
    user: User = Relationship(back_populates="history")
    track: Track = Relationship(back_populates="history")