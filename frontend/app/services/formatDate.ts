/** Date formatée selon la langue (options d'Intl facultatives), « — » si absente ou invalide. */
export const formatDate = (
  value: string | number | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale, options);
};
