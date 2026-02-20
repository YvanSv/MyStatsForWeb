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

class Track(SQLModel, table=True):
    spotify_id: str = Field(primary_key=True)
    title: str
    artist_name: str
    album_name: str
    duration_ms: int
    image_url: Optional[str] = None
    history: List["TrackHistory"] = Relationship(back_populates="track")

class TrackHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(index=True)
    is_skipped: bool = Field(default=False)
    user_id: int = Field(foreign_key="user.id")
    spotify_id: str = Field(foreign_key="track.spotify_id")
    track: "Track" = Relationship(back_populates="history")