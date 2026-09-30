import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os

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

def get_spotify_users_client(access_token):
    """
    Initialise et retourne un client Spotify (mode Client-to-Server)
    """
    return spotipy.Spotify(auth=access_token)