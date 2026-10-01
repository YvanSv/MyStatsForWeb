// Formate le nombre en "1.2k" ou "1.2M" si l'utilisateur le souhaite
export const formatNumber = (num: number | null | undefined, shorten: boolean, locale: string = "fr-FR") => {
  const n = num ?? 0;
  if (!shorten) return n.toLocaleString(locale);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  // 999 950 s'arrondirait à "1000.0k" : on bascule alors en millions
  if (n >= 1000) return Math.round(n / 100) / 10 >= 1000 ? (n / 1000000).toFixed(1) + 'M' : (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString(locale);
};