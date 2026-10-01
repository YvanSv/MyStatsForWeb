// Bannière de profil par défaut : le serveur renvoie ce chemin quand l'utilisateur n'en a pas choisi
export const DEFAULT_BANNER = "/banner_template.jpg";
// Version redimensionnée affichée dans les pages (fichier de /public)
export const DEFAULT_BANNER_IMAGE = "/banner_template_1100x390.jpg";

/** Vrai quand la valeur désigne la bannière par défaut (absente, vide ou chemin du gabarit). */
export const isDefaultBanner = (banner: string | null | undefined): boolean => !banner || banner === DEFAULT_BANNER;
