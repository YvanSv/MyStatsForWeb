import { RATING_AVERAGE, RATING_GOOD } from "../../constants/ui";

/** Un nombre valide (ni undefined, ni null, ni NaN, ni Infinity). */
export const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Formate une statistique pour l'affichage, ou « - » quand la valeur est absente ou invalide. */
export const formatStat = (value: number | null | undefined, locale: string): string =>
  isValidNumber(value) ? value.toLocaleString(locale) : "-";

/** Valeur numérique sûre pour un calcul ou une largeur de barre (0 si absente ou invalide). */
export const safeNumber = (value: number | null | undefined): number => (isValidNumber(value) ? value : 0);

// Seuils de note définis dans constants/ui.ts, réexportés ici pour les composants de classement
export { RATING_GOOD, RATING_AVERAGE };

/** Classe de couleur d'une note selon les seuils partagés (la note absente ou invalide compte comme 0). */
export const ratingColorClass = (rating: number | null | undefined): string => {
  const value = safeNumber(rating);
  return value >= RATING_GOOD ? "text2" : value >= RATING_AVERAGE ? "text-jaune" : "text-rouge";
};

/** Nombre de streams (séparateur de milliers selon la langue) ou « - ». */
export const formatStreams = (value: number | null | undefined, locale: string): string => formatStat(value, locale);

/** Minutes arrondies à l'unité (séparateur de milliers selon la langue) ou « - ». */
export const formatMinutes = (value: number | null | undefined, locale: string): string =>
  isValidNumber(value) ? Math.round(value).toLocaleString(locale) : "-";

/** Pourcentage (« 42,5% ») ou « - » seul quand la valeur est absente. */
export const formatPercent = (value: number | null | undefined, locale: string): string =>
  isValidNumber(value) ? `${formatStat(value, locale)}%` : "-";

/** Accole une unité à une valeur déjà formatée, sauf si elle est absente (« - » reste « - »). */
export const withUnit = (formatted: string, unit: string): string => (formatted === "-" ? formatted : `${formatted}${unit}`);
