from fastapi import APIRouter
from .utils.spotify_status import spotify_status
from app.response_message import SpotifyStatusResponse

router = APIRouter()

@router.get(
    '',
    summary="État de la connexion API Spotify",
    response_model=SpotifyStatusResponse,
    responses={
        200: {"description": "Retourne l'état opérationnel actuel de l'intégration Spotify."}
    }
)
async def get_spotify_api_status():
    """
    Vérifie la santé de la liaison entre ton serveur et les serveurs de Spotify.

    **Indicateurs fournis :**
    - **Connectivité** : Vérifie si les identifiants (`Client ID` / `Secret`) sont toujours valides.
    - **Performance** : Permet de savoir si l'application est actuellement bridée par Spotify (Rate Limiting).
    - **Disponibilité** : Confirme que le module `spotify_status` est capable de communiquer avec l'extérieur.

    **Utilité :** Ce point d'accès est souvent utilisé par les outils de monitoring ou par le Frontend pour afficher une alerte de maintenance si Spotify est injoignable.
    """
    return spotify_status.get_status()