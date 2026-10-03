import { FRONT_ROUTES } from "../constants/routes";
import type { ItemType } from "../hooks/apiTypes";

/**
 * Segment d'URL sûr pour un identifiant venu de l'adresse (id ou slug de profil).
 * Évite qu'un « / », « ? » ou « # » change la route appelée, sans ré-encoder une valeur déjà encodée
 * (« caf%C3%A9 » reste « caf%C3%A9 » et non « caf%25C3%25A9 »).
 */
export const pathSegment = (value: string | number): string => {
  const raw = String(value);
  let decoded = raw;
  try { decoded = decodeURIComponent(raw) } catch { /* « % » isolé : on encode la valeur telle quelle */ }
  return encodeURIComponent(decoded);
};

const DETAIL_BASE: Record<ItemType, string> = {
  track: FRONT_ROUTES.MY_TRACKS,
  album: FRONT_ROUTES.MY_ALBUMS,
  artist: FRONT_ROUTES.MY_ARTISTS,
};

/** Page de détail d'un élément de l'utilisateur connecté (« /my/tracks/12 »), identifiant encodé comme les autres liens. */
export const itemDetailPath = (type: ItemType, id: string | number): string => `${DETAIL_BASE[type]}/${pathSegment(id)}`;

/** Page de classement correspondant au type d'élément. */
export const itemRankingPath = (type: ItemType): string => DETAIL_BASE[type];
