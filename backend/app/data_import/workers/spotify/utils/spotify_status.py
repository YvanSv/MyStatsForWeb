from datetime import datetime, timedelta
from typing import Optional

class SpotifyStatus:
    _is_limited: bool = False
    _retry_after: Optional[datetime] = None

    @classmethod
    def set_rate_limited(cls, seconds: int = 60):
        cls._is_limited = True
        cls._retry_after = datetime.now() + timedelta(seconds=seconds)

    @classmethod
    def get_status(cls):
        # Si on est après le temps de retry, on remet à zéro
        if cls._is_limited and cls._retry_after and datetime.now() > cls._retry_after:
            cls._is_limited = False
            cls._retry_after = None
        
        return {
            "is_rate_limited": cls._is_limited,
            "retry_after_seconds": int((cls._retry_after - datetime.now()).total_seconds()) if cls._retry_after else 0
        }

spotify_status = SpotifyStatus()