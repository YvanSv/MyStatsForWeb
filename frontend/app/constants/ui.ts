// Largeur à partir de laquelle la mise en page desktop s'applique (breakpoint `lg` de Tailwind)
export const DESKTOP_BREAKPOINT = 1024;

// Pagination et tri par défaut des classements
export const DEFAULT_PAGE_OFFSET = 0;
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_SORT = "play_count";
export const DEFAULT_DIRECTION = "desc";

// Hauteurs des graphiques du dashboard (px)
export const CHART_HEIGHT_MOBILE = 200;
export const CHART_HEIGHT_DESKTOP = 250;

// Seuils de note : à partir de RATING_GOOD la note est bonne (vert), à partir de RATING_AVERAGE elle est moyenne (jaune)
export const RATING_GOOD = 1.35;
export const RATING_AVERAGE = 0.8;

// Couleurs de la charte reprises hors de Tailwind (SVG, graphiques, toasts)
export const COLORS = {
  SPOTIFY_GREEN: "#1DB954",
  SPOTIFY_GREEN_LIGHT: "#1DD05D",
  SPOTIFY_GREEN_DARK: "#065e25",
  PURPLE: "#c084fc",
  SURFACE: "#1A1A1A",
  WHITE: "#FFFFFF",
} as const;

// Style commun des toasts
export const TOAST_STYLE = {
  borderRadius: "15px",
  background: COLORS.SURFACE,
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)",
} as const;
