import type { PlacedWidget } from "./interfaces";
import { STORAGE_KEYS } from "../constants/storage";

export const GRID_COLS = 3;
export const GRID_ROWS = 5;
export const GRID_CELLS = GRID_COLS * GRID_ROWS;

export const LAYOUT_STORAGE_KEY = STORAGE_KEYS.RESUME_LAYOUT;
export const LAYOUT_VERSION = 1;

// Types de widgets valides : dérivés du registre (widgetRegistry.tsx)
export { WIDGET_TYPES, isWidgetType } from "./widgetRegistry";
import { isWidgetType } from "./widgetRegistry";

type Footprint = Pick<PlacedWidget, "index" | "w" | "h">;

/** Vrai si le rectangle (index, w, h) est entièrement dans la grille 3 x 5. */
export const fitsInGrid = ({ index, w, h }: Footprint): boolean => {
  if (![index, w, h].every(Number.isInteger)) return false;
  if (index < 0 || index >= GRID_CELLS || w < 1 || h < 1) return false;
  return (index % GRID_COLS) + w <= GRID_COLS && Math.floor(index / GRID_COLS) + h <= GRID_ROWS;
};

/**
 * Ordre d'empilement : l'ordre du tableau `widgets` (le dernier est au-dessus). Les quatre fonctions
 * sont pures ; sans changement possible (id inconnu, déjà à l'extrémité), elles renvoient le même tableau.
 */
const moveTo = (widgets: PlacedWidget[], id: number, target: (from: number, last: number) => number): PlacedWidget[] => {
  const from = widgets.findIndex((w) => w.id === id);
  if (from === -1) return widgets;
  const to = target(from, widgets.length - 1);
  if (to === from) return widgets;
  const next = widgets.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export const moveToFront = (widgets: PlacedWidget[], id: number): PlacedWidget[] => moveTo(widgets, id, (_f, last) => last);
export const moveToBack = (widgets: PlacedWidget[], id: number): PlacedWidget[] => moveTo(widgets, id, () => 0);
export const moveForward = (widgets: PlacedWidget[], id: number): PlacedWidget[] => moveTo(widgets, id, (f, last) => Math.min(last, f + 1));
export const moveBackward = (widgets: PlacedWidget[], id: number): PlacedWidget[] => moveTo(widgets, id, (f) => Math.max(0, f - 1));

/** Prochain identifiant libre : max(ids) + 1. */
export const nextWidgetId = (widgets: PlacedWidget[]): number =>
  widgets.reduce((max, w) => Math.max(max, w.id), 0) + 1;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Anciens types « top 5 » (un par élément), fusionnés en `top_five` + réglage `entity`. */
const LEGACY_TOP_FIVE = { top_tracks: "tracks", top_albums: "albums", top_artists: "artists" } as const;

/**
 * Relit une mise en page sérialisée (les chevauchements sont permis : l'ordre du tableau est l'ordre d'empilement). Jamais d'exception : JSON invalide, version inconnue ou
 * widget invalide (type inconnu, hors grille, id dupliqué) donnent une liste
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
    const legacy = typeof type === "string" && Object.hasOwn(LEGACY_TOP_FIVE, type) ? LEGACY_TOP_FIVE[type as keyof typeof LEGACY_TOP_FIVE] : null;
    if (!legacy && !isWidgetType(type)) continue;
    if (typeof index !== "number" || typeof w !== "number" || typeof h !== "number") continue;
    const base = isPlainObject(settings) ? settings : {};
    const widget = (legacy
      ? { id, type: "top_five", index, w, h, settings: { ...base, entity: legacy } }
      : { id, type, index, w, h, settings: base }) as PlacedWidget;
    if (!fitsInGrid(widget)) continue;
    if (result.some((r) => r.id === id)) continue;
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
