// Bannière de profil par défaut : le serveur renvoie ce chemin quand l'utilisateur n'en a pas choisi
export const DEFAULT_BANNER = "/banner_template.jpg";
// Version redimensionnée affichée dans les pages (fichier de /public)
export const DEFAULT_BANNER_IMAGE = "/banner_template_1100x390.jpg";

/** Vrai quand la valeur désigne la bannière par défaut (absente, vide ou chemin du gabarit). */
export const isDefaultBanner = (banner: string | null | undefined): boolean => !banner || banner === DEFAULT_BANNER;

// Texture de grain du fond (fichier de /public, plus de service externe)
export const NOISE_TEXTURE = "/noise.svg";
// Image affichée quand une illustration manque ou ne se charge pas (fichier de /public)
export const PLACEHOLDER_IMAGE = "/img-placeholder.jpg";
// Avatar par défaut : généré localement à partir du nom, sans service externe
export const defaultAvatar = (name: string | number | null | undefined): string => {
  const initial = (String(name ?? "").trim().charAt(0) || "?").toUpperCase().replace(/[<>&"']/g, "?");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1A1A1A"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="#1DB954">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
