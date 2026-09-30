import os
import httpx

# Récupération des variables d'environnement
SOUNDCHARTS_APP_ID = os.getenv("SOUNDCHARTS_CLIENT_ID") or 'soundcharts'
SOUNDCHARTS_API_KEY = os.getenv("SOUNDCHARTS_CLIENT_SECRET") or 'soundcharts'

class SoundchartsClient:
    """
    Client minimaliste pour interagir avec l'API Soundcharts.
    Le mode Server-to-Server consiste à passer les credentials dans les headers.
    """
    def __init__(self, app_id: str, api_key: str):
        self.base_url = "https://customer.api.soundcharts.com/api/v2.25"
        self.headers = {
            "x-app-id": app_id,
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }

    async def get_song_by_apple_id(self, apple_track_id: str):
        """
        Récupère les métadonnées d'un morceau via son identifiant Apple Music.
        """
        url = f"{self.base_url}/song/by-platform/apple-music/{apple_track_id}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 200: response.json()
                elif response.status_code == 429:
                    print("⚠️ Soundcharts API: Rate Limit atteint.")
                    return "RATE_LIMIT"
                else:
                    print(f"❌ Erreur Soundcharts ({response.status_code}): {response.text}")
                    return None
            except Exception as e:
                print(f"❌ Erreur de connexion Soundcharts: {e}")
                return None

def get_soundcharts_client():
    """
    Initialise et retourne une instance du client Soundcharts.
    """
    if not SOUNDCHARTS_APP_ID or not SOUNDCHARTS_API_KEY:
        raise ValueError("Les variables d'environnement SOUNDCHARTS_CLIENT_ID ou SECRET sont manquantes.")
        
    return SoundchartsClient(
        app_id=SOUNDCHARTS_APP_ID,
        api_key=SOUNDCHARTS_API_KEY
    )