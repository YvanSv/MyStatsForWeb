import { COLORS } from "../../constants/ui";
import type { TextSize } from "../interfaces";

/** Valeur affichée quand une donnée est absente ou inexploitable. */
export const EMPTY_VALUE = "–";
/** Longueur maximale du texte libre. */
export const FREE_TEXT_MAX_LENGTH = 80;
/** Opacité par défaut du filigrane. */
export const DEFAULT_LOGO_OPACITY = 0.4;
/** Couleurs proposées par les réglages des nouveaux widgets (vert Spotify en premier = couleur par défaut). */
export const WIDGET_COLORS = [COLORS.SPOTIFY_GREEN, COLORS.WHITE, "#FBBF24", "#F87171", "#60A5FA"] as const;

/** Taille de texte selon le réglage et la mise en page (1x1 < 2x1 < 2x2). */
export const TEXT_SIZES: Record<TextSize, Record<"1x1" | "2x1" | "2x2", string>> = {
  sm: { "1x1": "text-[8px]", "2x1": "text-sm", "2x2": "text-xl" },
  md: { "1x1": "text-[11px]", "2x1": "text-xl", "2x2": "text-3xl" },
  lg: { "1x1": "text-sm", "2x1": "text-3xl", "2x2": "text-5xl" },
};

/** Nombre fini, sinon null (null, undefined, NaN, Infinity, texte). */
export const finiteOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
