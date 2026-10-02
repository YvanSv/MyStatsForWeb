/** Durée en millisecondes au format m:ss, « — » si absente ou invalide. */
export const formatDuration = (ms: number | undefined): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  // On arrondit d'abord à la seconde : 59,5 s doit donner 1:00 et non 0:60
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
