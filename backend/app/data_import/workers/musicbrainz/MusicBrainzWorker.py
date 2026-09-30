import httpx

class MusicBrainzClient:
    """
    Client pour interagir avec l'API MusicBrainz (Web Service v2).
    MusicBrainz demande un User-Agent spécifique avec un contact (email).
    """
    def __init__(self):
        self.base_url = "https://musicbrainz.org/ws/2"
        # CRITIQUE : MusicBrainz requiert un User-Agent identifiable
        self.headers = {
            "User-Agent": "MyStatsFy/0.12.2 ( yvan.savergne@gmail.com )",
            "Accept": "application/json"
        }

    async def get_recording_by_search(self, track_name: str, artist_name: str):
        """
        Recherche un morceau (recording) par nom et artiste.
        MusicBrainz utilise la syntaxe Lucene pour les requêtes complexes.
        """
        # On échappe les guillemets pour éviter de casser la requête Lucene
        clean_track = track_name.replace('"', '')
        clean_artist = artist_name.replace('"', '')
        
        url = f"{self.base_url}/recording"
        params = {
            "query": f'recording:"{clean_track}" AND artist:"{clean_artist}"',
            "fmt": "json",
            "limit": 5
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    total_count = data.get("count", 0)
                    recordings = data.get("recordings", [])
                    if total_count == 1 and len(recordings) == 1:
                        print(f"✅ Match unique trouvé pour {track_name}")
                        return recordings[0]
                    
                    elif total_count > 1:
                        print(f"⚠️ Plusieurs résultats ({total_count}) pour {track_name}. Ignoré par sécurité.")
                        return recordings
                    
                    else:
                        print(f"ℹ️ Aucun résultat pour {track_name}")
                        return None
                
                elif response.status_code == 503:
                    print("⚠️ MusicBrainz API: Rate Limit atteint (1 req/sec).")
                    return "RATE_LIMIT"
                
                else:
                    print(f"❌ Erreur MusicBrainz ({response.status_code}): {response.text}")
                    return None
            except Exception as e:
                print(f"❌ Erreur de connexion MusicBrainz: {e}")
                return None

    async def get_album_artwork(self, release_mbid: str):
        """
        MusicBrainz n'héberge pas les images. Il faut passer par Cover Art Archive.
        """
        url = f"https://coverartarchive.org/release/{release_mbid}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    images = response.json().get("images", [])
                    # On cherche l'image 'Front'
                    for img in images:
                        if img.get("front"):
                            return img.get("image") # URL de l'image
                return None
            except Exception:
                return None

def get_musicbrainz_client():
    """
    Initialise et retourne une instance du client MusicBrainz.
    """
    return MusicBrainzClient()