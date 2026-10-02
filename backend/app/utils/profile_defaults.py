from app.models import Artist, User

# Valeurs de repli renvoyées par l'API quand l'utilisateur n'a rien personnalisé
DEFAULT_BANNER = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070"
# Le profil complet (/profile/{slug}) renvoie historiquement un fichier local plutôt que l'image Unsplash
DEFAULT_PROFILE_BANNER = "/banner_template.jpg"

def default_avatar(user: User) -> str:
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.id}"

def default_artist_image(artist: Artist) -> str:
    return f"https://api.dicebear.com/7.x/initials/svg?seed={artist.name}"
