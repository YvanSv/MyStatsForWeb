// Nom de marque : identique dans toutes les langues
export const APP_NAME = "MyStats";

// Adresse publique du site : une seule source pour les métadonnées et l'adresse affichée dans l'édition du profil
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://mystatsfy.vercel.app").replace(/\/+$/, "");
// Même adresse sans le protocole (« mystatsfy.vercel.app »), pour l'affichage
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
