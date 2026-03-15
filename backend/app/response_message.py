from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

# --- 1. CLASSES DE BASE (Abstractions) ---

class BaseResponse(BaseModel):
    status: str = "success"

class MessageResponse(BaseResponse):
    message: str

class BaseMetadataResponse(BaseModel):
    max_streams: int
    max_minutes: int
    max_rating: float
    date_min: Optional[str]
    date_max: Optional[str]

class BaseStatsResponse(BaseModel):
    play_count: int
    total_minutes: float
    engagement: float
    rating: float

# --- 2. AUTHENTIFICATION & COMPTE ---

class DetailMessage(BaseModel):
    detail: str

class LoginSuccessResponse(BaseResponse):
    user_id: int

class RegisterSuccessResponse(MessageResponse):
    user_id: int

class LogoutResponse(MessageResponse):
    message: str = "Déconnexion réussie"

class UserMeResponse(BaseModel):
    id: int
    slug: Optional[str]
    user_name: str
    has_spotify: bool
    is_logged_in: bool
    spotify_email: Optional[str] = None

class UpdateSuccessResponse(MessageResponse):
    message: str = "Profil mis à jour"
    user_name: str

class UnlinkSuccessResponse(MessageResponse):
    message: str = "Spotify délié"

# --- 3. STATISTIQUES MUSICALES (Héritage) ---

# Métadonnées pour les filtres
class AlbumMetadataResponse(BaseMetadataResponse): pass
class ArtistMetadataResponse(BaseMetadataResponse): pass
class TrackMetadataResponse(BaseMetadataResponse): pass

# Objets de statistiques
class AlbumStatsResponse(BaseStatsResponse):
    spotify_id: str
    name: str
    artist: str
    cover: Optional[str]

class ArtistStatsResponse(BaseStatsResponse):
    id: str
    name: str
    image_url: Optional[str]
    total_minutes: int  # Override pour les artistes

class TrackStatsResponse(BaseStatsResponse):
    spotify_id: str
    title: str
    artist: str
    album: str
    cover: Optional[str]
    duration_ms: int
    total_minutes: int

# --- 4. PROFIL & SOCIAL ---

class ProfileItem(BaseModel):
    name: str
    image_url: str
    sub: str
    count: int

class RecentTrack(BaseModel):
    id: int
    title: str
    artist: str
    image_url: str
    played_at: datetime

class BaseUserProfile(BaseModel):
    display_name: str
    bio: str
    avatar: str
    banner: str
    perms: Dict[str, bool]

class UserSettingsResponse(BaseModel):
    display_name: str
    bio: Optional[str]
    slug: Optional[str] = None
    avatar_url: Optional[str]
    banner_url: Optional[str]
    perms: Dict[str, bool]

class UserProfileResponse(BaseUserProfile):
    total_minutes: int
    total_streams: int
    peak_hour: str
    top_50_tracks: List[ProfileItem]
    top_50_artists: List[ProfileItem]
    top_50_albums: List[ProfileItem]
    recent_tracks: List[RecentTrack]


class UserUpdateResponse(BaseResponse):
    message: str = "Profil mis à jour avec succès"
    user: UserSettingsResponse

# --- 5. SYSTÈME & MAINTENANCE ---

class GlobalStatsResponse(BaseModel):
    users: int
    streams: int
    tracks: int
    albums: int
    artists: int

class MaintenanceTaskResponse(BaseResponse):
    message: str

class SpotifyStatusResponse(BaseModel):
    is_rate_limited: bool
    retry_after_seconds: int
    message: Optional[str] = "System Operational"

class UploadSuccessResponse(BaseResponse):
    added: Optional[int] = 0
    info: Optional[str] = None