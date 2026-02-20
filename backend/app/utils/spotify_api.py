import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os

# Assure-toi que ces variables sont bien dans ton .env
SPOTIPY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

def get_spotify_client():
    """
    Initialise et retourne un client Spotify (mode Server-to-Server)
    """
    auth_manager = SpotifyClientCredentials(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET
    )
    return spotipy.Spotify(auth_manager=auth_manager)