import { describe, expect, expectTypeOf, it } from "vitest";
import { languages } from "../constants/locales/lang";
import { GRID_COLS, GRID_ROWS, WIDGET_TYPES as GRID_WIDGET_TYPES, fitsInGrid, isWidgetType as gridIsWidgetType } from "./gridLayout";
import type { ResumeData, WidgetSettingsMap, WidgetType } from "./interfaces";
import { WIDGET_CATEGORIES, WIDGET_REGISTRY, WIDGET_TYPES, getWidgetDefinition, isWidgetType, widgetsOfCategory } from "./widgetRegistry";

const sample: ResumeData = {
  user: { display_name: "Yvan", bio: "Ma bio", avatar: "a.png", banner: "b.png", perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true } },
  topArtists: [{ name: "A", minutes: 1, rating: 1, streams: 1 }], topTracks: [], topAlbums: [],
  minutes: 1234, streams: 567, distinct_tracks: 11, distinct_albums: 22, distinct_artists: 33,
};

const defs = WIDGET_TYPES.map((t) => [t, getWidgetDefinition(t)] as const);

describe("registre des widgets", () => {
  it("contient les 9 types historiques (ids persistés inchangés)", () => {
    expect([...WIDGET_TYPES].sort()).toEqual(
      ["background", "bio", "minutes", "nb_albums", "nb_artists", "nb_tracks", "profile_picture", "streams", "username"],
    );
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
