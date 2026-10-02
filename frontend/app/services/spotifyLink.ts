import { SPOTIFY_WEB_URL } from "../constants/app";

/**
 * Adresse ouverte par la pastille « live » : la page Spotify du titre en cours quand elle est fournie et appartient bien
 * à open.spotify.com (https), sinon le lecteur web de Spotify. Une valeur inattendue n'est jamais utilisée comme lien.
 */
export const spotifyHref = (url: string | null | undefined): string => {
  try {
    const parsed = new URL(url ?? "");
    if (parsed.protocol === "https:" && parsed.hostname === "open.spotify.com") return parsed.toString();
  } catch {
    // adresse absente ou invalide : repli ci-dessous
  }
  return SPOTIFY_WEB_URL;
};
