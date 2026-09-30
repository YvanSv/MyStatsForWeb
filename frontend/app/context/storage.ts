/**
 * Accès tolérant à localStorage : il peut lever une exception (navigation privée, stockage bloqué ou plein)
 * ou être absent (rendu serveur). Ces préférences ne sont jamais vitales : en cas d'échec on les ignore.
 */
export const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // préférence non sauvegardée : sans conséquence
  }
};
