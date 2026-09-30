/** Un nombre valide (ni undefined, ni null, ni NaN, ni Infinity). */
export const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Formate une statistique pour l'affichage, ou « - » quand la valeur est absente ou invalide. */
export const formatStat = (value: number | null | undefined, locale: string): string =>
  isValidNumber(value) ? value.toLocaleString(locale) : "-";

/** Valeur numérique sûre pour un calcul ou une largeur de barre (0 si absente ou invalide). */
export const safeNumber = (value: number | null | undefined): number => (isValidNumber(value) ? value : 0);
