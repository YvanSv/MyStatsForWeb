/**
 * Saisons météorologiques de l'hémisphère nord, partagées par le dashboard et le résumé :
 * hiver décembre-février, printemps mars-mai, été juin-août, automne septembre-novembre.
 */
export type SeasonIndex = 0 | 1 | 2 | 3; // 0 hiver, 1 printemps, 2 été, 3 automne

/** Mois de départ (0 = janvier) de chaque saison */
const START_MONTH = [11, 2, 5, 8] as const;

/** Saison d'un mois (0 = janvier ... 11 = décembre). */
export const seasonOfMonth = (month: number): SeasonIndex => Math.floor(((month + 1) % 12) / 3) as SeasonIndex;

/**
 * Premier jour (minuit, heure locale) de la saison située à `offset` saisons de celle de `ref`
 * (0 = saison courante, négatif = passé, positif = futur).
 */
export const seasonStart = (ref: Date, offset = 0): Date => {
  const month = ref.getMonth();
  // En janvier et février, l'hiver courant a commencé en décembre de l'année précédente
  const year = ref.getFullYear() - (month < 2 ? 1 : 0);
  return new Date(year, START_MONTH[seasonOfMonth(month)] + offset * 3, 1, 0, 0, 0, 0);
};

/** Dernier instant (23:59:59.999, heure locale) de la saison commençant à `start`. */
export const seasonEnd = (start: Date): Date =>
  new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
