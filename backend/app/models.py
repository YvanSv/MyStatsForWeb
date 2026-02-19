from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    spotify_id: str = Field(index=True, unique=True)
    display_name: str
    email: str
    refresh_token: str

class Track(SQLModel, table=True):
    spotify_id: str = Field(primary_key=True) # URI Spotify
    title: str
    artist_name: str
    album_name: str
    duration_ms: int
    image_url: Optional[str] = None
    
    # Lien vers l'historique
    history: List["PlayHistory"] = Relationship(back_populates="track")

class PlayHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    is_skipped: bool = Field(default=False)
    
    # Relations
    user_id: int = Field(foreign_key="user.id")
    track_id: str = Field(foreign_key="track.spotify_id")
    
    track: Track = Relationship(back_populates="history")