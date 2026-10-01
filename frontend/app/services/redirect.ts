import { FRONT_ROUTES } from "../constants/routes";

const MAX_LENGTH = 2048;

/**
 * Chemin de retour accepté après connexion, ou null.
 * Seuls les chemins du site sont acceptés (jamais d'URL absolue ni de « //hôte » : redirection ouverte),
 * et jamais la page de connexion elle-même (boucle).
 */
export const safeRedirectPath = (raw: string | null | undefined): string | null => {
  if (!raw || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const url = new URL(raw, "http://localhost");
    if (url.origin !== "http://localhost") return null;
    if (url.pathname === FRONT_ROUTES.AUTH || url.pathname.startsWith(`${FRONT_ROUTES.AUTH}/`)) return null;
  } catch {
    return null;
  }
  return raw;
};

/** URL de la page de connexion qui ramènera l'utilisateur vers `path` (chemin et query string d'origine). */
export const authUrlFor = (path: string): string => {
  const safe = safeRedirectPath(path);
  return safe ? `${FRONT_ROUTES.AUTH}?redirect=${encodeURIComponent(safe)}` : FRONT_ROUTES.AUTH;
};
