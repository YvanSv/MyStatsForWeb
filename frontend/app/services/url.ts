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
