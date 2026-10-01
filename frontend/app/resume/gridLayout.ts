import type { PlacedWidget } from "./interfaces";

export const GRID_COLS = 3;
export const GRID_ROWS = 5;
export const GRID_CELLS = GRID_COLS * GRID_ROWS;

export const LAYOUT_STORAGE_KEY = "mystats-resume-layout-v1";
export const LAYOUT_VERSION = 1;

/** Types de widgets que le canvas sait afficher (ceux proposés par WidgetsView / traités par getFreshData). */
export const WIDGET_TYPES = [
  "profile_picture", "username", "background", "bio",
  "minutes", "streams", "nb_tracks", "nb_albums", "nb_artists",
] as const;

export const isWidgetType = (type: unknown): type is (typeof WIDGET_TYPES)[number] =>
  typeof type === "string" && (WIDGET_TYPES as readonly string[]).includes(type);

type Footprint = Pick<PlacedWidget, "index" | "w" | "h">;

/** Vrai si le rectangle (index, w, h) est entièrement dans la grille 3 x 5. */
export const fitsInGrid = ({ index, w, h }: Footprint): boolean => {
  if (![index, w, h].every(Number.isInteger)) return false;
  if (index < 0 || index >= GRID_CELLS || w < 1 || h < 1) return false;
  return (index % GRID_COLS) + w <= GRID_COLS && Math.floor(index / GRID_COLS) + h <= GRID_ROWS;
};

/** Vrai si les deux rectangles partagent au moins une cellule. */
export const overlaps = (a: Footprint, b: Footprint): boolean => {
  const aCol = a.index % GRID_COLS, aRow = Math.floor(a.index / GRID_COLS);
  const bCol = b.index % GRID_COLS, bRow = Math.floor(b.index / GRID_COLS);
  return aCol < bCol + b.w && bCol < aCol + a.w && aRow < bRow + b.h && bRow < aRow + a.h;
};

/** Vrai si `candidate` chevauche l'un des widgets de `others` (le widget d'id `ignoreId` est exclu). */
export const collides = (candidate: Footprint, others: PlacedWidget[], ignoreId?: number): boolean =>
  others.some((o) => o.id !== ignoreId && overlaps(candidate, o));

/** Prochain identifiant libre : max(ids) + 1. */
export const nextWidgetId = (widgets: PlacedWidget[]): number =>
  widgets.reduce((max, w) => Math.max(max, w.id), 0) + 1;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Relit une mise en page sérialisée. Jamais d'exception : JSON invalide, version inconnue ou
 * widget invalide (type inconnu, hors grille, chevauchement, id dupliqué) donnent une liste
 * vide ou ignorent simplement le widget fautif.
 */
export const parseLayout = (raw: string | null): PlacedWidget[] => {
  if (!raw) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!isPlainObject(data) || data.version !== LAYOUT_VERSION || !Array.isArray(data.widgets)) return [];

  const result: PlacedWidget[] = [];
  for (const item of data.widgets) {
    if (!isPlainObject(item)) continue;
    const { id, type, index, w, h, settings } = item;
    if (typeof id !== "number" || !Number.isInteger(id) || id < 1) continue;
    if (!isWidgetType(type)) continue;
    if (typeof index !== "number" || typeof w !== "number" || typeof h !== "number") continue;
    const widget: PlacedWidget = { id, type, index, w, h, settings: isPlainObject(settings) ? settings : {} };
    if (!fitsInGrid(widget)) continue;
    if (result.some((r) => r.id === id)) continue;
    if (collides(widget, result)) continue;
    result.push(widget);
  }
  return result;
};

export const serializeLayout = (widgets: PlacedWidget[]): string =>
  JSON.stringify({
    version: LAYOUT_VERSION,
    widgets: widgets.map(({ id, type, index, w, h, settings }) => ({ id, type, index, w, h, settings })),
  });

export const loadLayout = (): PlacedWidget[] => {
  try {
    return parseLayout(window.localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch {
    return [];
  }
};

export const saveLayout = (widgets: PlacedWidget[]): void => {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, serializeLayout(widgets));
  } catch {
    // stockage indisponible ou plein : la mise en page reste simplement non persistée
  }
};

/** Pseudo -> slug [a-z0-9-] (accents retirés), « profil » si vide ou absent. */
export const slugifyName = (name: unknown): string => {
  const slug = (typeof name === "string" ? name : "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "profil";
};

export const exportFileName = (range: string, displayName: unknown, timestamp: number): string =>
  `mystats-${slugifyName(range)}-${slugifyName(displayName)}-${timestamp}.png`;
