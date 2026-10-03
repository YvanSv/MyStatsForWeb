import { describe, expect, expectTypeOf, it } from "vitest";
import { languages } from "../constants/locales/lang";
import { GRID_COLS, GRID_ROWS, WIDGET_TYPES as GRID_WIDGET_TYPES, fitsInGrid, isWidgetType as gridIsWidgetType } from "./gridLayout";
import type { ResumeData, WidgetSettingsMap, WidgetType } from "./interfaces";
import { WIDGET_CATEGORIES, WIDGET_REGISTRY, WIDGET_TYPES, getWidgetDefinition, isWidgetType, widgetsOfCategory } from "./widgetRegistry";

const sample: ResumeData = {
  user: { display_name: "Yvan", bio: "Ma bio", avatar: "a.png", banner: "b.png", perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true } },
  topArtists: [{ name: "A", minutes: 1, rating: 1, streams: 1 }], topTracks: [{ name: "T", minutes: 2, rating: 1, streams: 2 }], topAlbums: [],
  minutes: 1234, streams: 567, distinct_tracks: 11, distinct_albums: 22, distinct_artists: 33,
  previous_minutes: 1000, previous_streams: 500, longest_streak_days: 9, current_streak_days: 3, new_artists: 4, periodLabel: "2026",
};
/** Réponse minimale d'un ancien backend : aucun champ optionnel. */
const bare: ResumeData = { ...sample, topArtists: [], topTracks: [], topAlbums: [] };
delete bare.previous_minutes; delete bare.previous_streams; delete bare.longest_streak_days; delete bare.current_streak_days; delete bare.new_artists; delete bare.periodLabel;

const defs = WIDGET_TYPES.map((t) => [t, getWidgetDefinition(t)] as const);

describe("registre des widgets", () => {
  it("contient les 9 types historiques (ids persistés inchangés)", () => {
    for (const id of ["background", "bio", "minutes", "nb_albums", "nb_artists", "nb_tracks", "profile_picture", "streams", "username"])
      expect(WIDGET_TYPES).toContain(id);
  });

  it("contient les 9 nouveaux types", () => {
    for (const id of ["top_five", "top_one", "period", "free_text", "comparison", "streak", "new_artists", "now_playing", "logo"])
      expect(WIDGET_TYPES).toContain(id);
    expect(WIDGET_TYPES).toHaveLength(18);
  });

  it("catégorie « top » pour les classements, titre traduit en fr et en", () => {
    expect(WIDGET_CATEGORIES.map((c) => c.id)).toEqual(["account", "stats", "top", "other"]);
    expect(widgetsOfCategory("top").map((d) => d.type)).toEqual(["top_five", "top_one"]);
    for (const lang of ["fr", "en"] as const)
      for (const c of WIDGET_CATEGORIES) expect((languages[lang].resume as Record<string, unknown>)[c.titleKey]).toEqual(expect.any(String));
  });

  it.each(defs)("%s : select() ne renvoie jamais undefined, même sans champs optionnels", (_t, def) => {
    expect(def.select(bare)).not.toBeUndefined();
  });

  it("select() des nouveaux widgets", () => {
    expect(WIDGET_REGISTRY.top_five.select(sample)).toEqual({ tracks: sample.topTracks, albums: [], artists: sample.topArtists });
    expect(WIDGET_REGISTRY.top_five.select(bare)).toEqual({ tracks: [], albums: [], artists: [] });
    expect(WIDGET_REGISTRY.top_one.select(sample)).toEqual({ tracks: sample.topTracks[0], albums: undefined, artists: sample.topArtists[0] });
    expect(WIDGET_REGISTRY.period.select(sample)).toBe("2026");
    expect(WIDGET_REGISTRY.period.select(bare)).toBeNull();
    expect(WIDGET_REGISTRY.comparison.select(sample)).toEqual({ minutes: 1234, previous_minutes: 1000, streams: 567, previous_streams: 500 });
    expect(WIDGET_REGISTRY.streak.select(sample)).toEqual({ longest_streak_days: 9, current_streak_days: 3 });
    expect(WIDGET_REGISTRY.new_artists.select(sample)).toBe(4);
    expect(WIDGET_REGISTRY.new_artists.select(bare)).toBeNull();
  });

  it("top_five : sous-titre générique traduit", () => {
    expect(WIDGET_REGISTRY.top_five.subtitle).toBe("subtitleTopFive");
    expect(WIDGET_REGISTRY.top_five.labelKey).toBe("widgetTopFive");
  });

  it.each(defs)("%s : définition cohérente", (type, def) => {
    expect(def.type).toBe(type);
    expect(typeof def.Component).toBe("function");
    expect(def.Settings === null || typeof def.Settings === "function").toBe(true);
    expect(typeof def.select).toBe("function");
    expect(def.icon).not.toBe("");
    expect(WIDGET_CATEGORIES.map((c) => c.id)).toContain(def.category);
  });

  it.each(defs)("%s : réglages par défaut = objet simple sérialisable", (_t, def) => {
    expect(typeof def.defaultSettings).toBe("object");
    expect(JSON.parse(JSON.stringify(def.defaultSettings))).toEqual(def.defaultSettings);
  });

  it.each(defs)("%s : libellé et sous-titre existent en fr et en", (_t, def) => {
    for (const lang of ["fr", "en"] as const) {
      const r = languages[lang].resume as Record<string, unknown>;
      expect(typeof r[def.labelKey]).toBe("string");
      expect(r[def.labelKey]).not.toBe("");
      if (typeof def.subtitle === "string") expect(typeof r[def.subtitle]).toBe("string");
    }
  });

  it.each(defs)("%s : taille par défaut dans la grille (et >= minSize)", (_t, def) => {
    expect(fitsInGrid({ index: 0, ...def.defaultSize })).toBe(true);
    // placé en bas à droite, le widget doit tenir à son tour
    const last = GRID_COLS * GRID_ROWS - def.defaultSize.w - (def.defaultSize.h - 1) * GRID_COLS;
    expect(fitsInGrid({ index: last, ...def.defaultSize })).toBe(true);
    if (def.minSize) {
      expect(def.defaultSize.w).toBeGreaterThanOrEqual(def.minSize.w);
      expect(def.defaultSize.h).toBeGreaterThanOrEqual(def.minSize.h);
      expect(fitsInGrid({ index: 0, ...def.minSize })).toBe(true);
    }
  });

  it.each(defs)("%s : select() extrait une donnée des données d'exemple", (_t, def) => {
    expect(def.select(sample)).toBeDefined();
  });

  it("select() renvoie les bonnes données", () => {
    expect(WIDGET_REGISTRY.profile_picture.select(sample)).toBe(sample.user);
    expect(WIDGET_REGISTRY.username.select(sample)).toBe("Yvan");
    expect(WIDGET_REGISTRY.background.select(sample)).toBe("b.png");
    expect(WIDGET_REGISTRY.bio.select(sample)).toBe("Ma bio");
    expect(WIDGET_REGISTRY.minutes.select(sample)).toBe(1234);
    expect(WIDGET_REGISTRY.streams.select(sample)).toBe(567);
    expect(WIDGET_REGISTRY.nb_tracks.select(sample)).toBe(11);
    expect(WIDGET_REGISTRY.nb_albums.select(sample)).toBe(22);
    expect(WIDGET_REGISTRY.nb_artists.select(sample)).toBe(33);
  });

  it("chaque widget est rangé dans exactement une catégorie listée", () => {
    const all = WIDGET_CATEGORIES.flatMap((c) => widgetsOfCategory(c.id).map((d) => d.type));
    expect([...all].sort()).toEqual([...WIDGET_TYPES].sort());
  });
});

describe("cohérence registre / WIDGET_TYPES / WidgetSettingsMap", () => {
  it("gridLayout expose exactement les types du registre", () => {
    expect([...GRID_WIDGET_TYPES]).toEqual([...WIDGET_TYPES]);
    for (const t of WIDGET_TYPES) expect(gridIsWidgetType(t)).toBe(true);
    for (const bad of ["", "inconnu", "toString", "__proto__", null, 3]) expect(isWidgetType(bad)).toBe(false);
  });

  it("le typage impose registre = clés de WidgetSettingsMap", () => {
    expectTypeOf<keyof typeof WIDGET_REGISTRY>().toEqualTypeOf<keyof WidgetSettingsMap>();
    expectTypeOf(WIDGET_TYPES).toEqualTypeOf<WidgetType[]>();
  });
});
