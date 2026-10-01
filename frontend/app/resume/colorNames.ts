import { COLORS } from "../constants/ui";

type ColorDict = {
  wColor: string;
  colorGreen: string; colorWhite: string; colorGray: string; colorSkyBlue: string;
  colorBlue: string; colorLightBlue: string; colorPink: string; colorPurple: string;
  colorAmber: string; colorRed: string; colorOrange: string; colorYellow: string;
};

// Clé du dictionnaire (t.resume) par valeur hexadécimale (minuscules)
export const COLOR_NAME_KEYS: Record<string, keyof ColorDict> = {
  [COLORS.SPOTIFY_GREEN.toLowerCase()]: "colorGreen",
  [COLORS.WHITE.toLowerCase()]: "colorWhite",
  "#9ca3af": "colorGray",
  "#38bdf8": "colorSkyBlue",
  "#3357ff": "colorBlue",
  "#60a5fa": "colorLightBlue",
  "#f472b6": "colorPink",
  "#a855f7": "colorPurple",
  "#fbbf24": "colorAmber",
  "#f87171": "colorRed",
  "#ff5733": "colorOrange",
  "#f1c40f": "colorYellow",
};

/** Nom lisible traduit d'une couleur ; libellé générique numéroté si inconnue. */
export function colorLabel(r: ColorDict, hex: string, index: number): string {
  const key = COLOR_NAME_KEYS[hex.toLowerCase()];
  return key ? r[key] : `${r.wColor} ${index + 1}`;
}
