// Formate le nombre en "1.2k" ou "1.2M" si l'utilisateur le souhaite
export const formatNumber = (num: number, shorten: boolean) => {
  if (!shorten) return num.toLocaleString();
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
};