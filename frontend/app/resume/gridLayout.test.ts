import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LAYOUT_STORAGE_KEY, WIDGET_TYPES, collides, exportFileName, fitsInGrid, isWidgetType, loadLayout,
  nextWidgetId, overlaps, parseLayout, saveLayout, serializeLayout, slugifyName,
} from "./gridLayout";
import type { PlacedWidget } from "./interfaces";

const pw = (over: Partial<PlacedWidget> = {}): PlacedWidget => ({
  id: 1, type: "username", index: 0, w: 1, h: 1, settings: { color: "red" }, ...over,
});
const payload = (widgets: unknown, version: unknown = 1) => JSON.stringify({ version, widgets });

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("isWidgetType", () => {
  it.each(WIDGET_TYPES)("accepte %s", (t) => expect(isWidgetType(t)).toBe(true));
  it.each(["", "inconnu", "top_tracks", null, undefined, 3, {}])("refuse %j", (t) => expect(isWidgetType(t)).toBe(false));
});

describe("fitsInGrid", () => {
  it.each([
    [0, 1, 1], [14, 1, 1], [0, 3, 5], [1, 2, 1], [12, 3, 1], [4, 2, 4],
  ])("index %i %ix%i tient dans la grille", (index, w, h) => expect(fitsInGrid({ index, w, h })).toBe(true));

  it.each([
    [-1, 1, 1], [15, 1, 1], [2, 2, 1], [13, 3, 1], [12, 1, 2], [0, 4, 1], [0, 1, 6],
    [0, 0, 1], [0, 1, 0], [0.5, 1, 1], [0, 1.5, 1], [NaN, 1, 1],
  ])("index %s %sx%s sort de la grille ou est invalide", (index, w, h) => expect(fitsInGrid({ index, w, h })).toBe(false));
});

describe("overlaps / collides", () => {
  it("détecte un chevauchement partiel et l'inclusion", () => {
    expect(overlaps({ index: 0, w: 2, h: 2 }, { index: 4, w: 1, h: 1 })).toBe(true);
    expect(overlaps({ index: 0, w: 3, h: 5 }, { index: 7, w: 1, h: 1 })).toBe(true);
  });
  it("des rectangles côte à côte ne se chevauchent pas", () => {
    expect(overlaps({ index: 0, w: 1, h: 1 }, { index: 1, w: 1, h: 1 })).toBe(false);
    expect(overlaps({ index: 0, w: 2, h: 1 }, { index: 3, w: 2, h: 1 })).toBe(false);
  });
  it("collides ignore le widget d'id donné (pour le redimensionnement)", () => {
    const others = [pw({ id: 1, index: 0 }), pw({ id: 2, index: 1 })];
    expect(collides({ index: 0, w: 2, h: 1 }, others)).toBe(true);
    expect(collides({ index: 0, w: 2, h: 1 }, others, 2)).toBe(true); // touche toujours le 1
    expect(collides({ index: 0, w: 1, h: 2 }, others, 1)).toBe(false);
  });
});

describe("nextWidgetId", () => {
  it("vaut 1 pour une liste vide", () => expect(nextWidgetId([])).toBe(1));
  it("vaut max + 1 même après une suppression au milieu", () => {
    expect(nextWidgetId([pw({ id: 1 }), pw({ id: 5, index: 1 })])).toBe(6);
  });
});

describe("parseLayout", () => {
  it("relit une mise en page valide à l'identique", () => {
    const widgets = [pw({ id: 1 }), pw({ id: 2, type: "bio", index: 4, w: 2, h: 2, settings: { a: [1] } })];
    expect(parseLayout(serializeLayout(widgets))).toEqual(widgets);
  });

  it.each([null, "", "pas du json", "{", "null", "42", '"x"', "[]", "{}"])("retourne [] pour %j", (raw) => {
    expect(parseLayout(raw)).toEqual([]);
  });

  it("retourne [] pour une version inconnue ou absente", () => {
    expect(parseLayout(payload([pw()], 2))).toEqual([]);
    expect(parseLayout(payload([pw()], "1"))).toEqual([]);
    expect(parseLayout(JSON.stringify({ widgets: [pw()] }))).toEqual([]);
  });

  it("retourne [] si widgets n'est pas un tableau", () => {
    expect(parseLayout(payload({ a: 1 }))).toEqual([]);
  });

  it("ignore les widgets de type inconnu, mais garde les autres", () => {
    expect(parseLayout(payload([pw({ type: "inconnu" }), pw({ id: 2, index: 1 })]))).toEqual([pw({ id: 2, index: 1 })]);
  });

  it.each([
    ["index négatif", { index: -1 }], ["index trop grand", { index: 15 }],
    ["index décimal", { index: 1.5 }], ["largeur nulle", { w: 0 }], ["hauteur négative", { h: -1 }],
    ["sort à droite", { index: 2, w: 2 }], ["sort en bas", { index: 12, h: 2 }],
    ["trop large", { w: 4 }], ["trop haut", { h: 6 }],
    ["id nul", { id: 0 }], ["id décimal", { id: 1.5 }], ["id texte", { id: "1" }],
    ["index texte", { index: "0" }], ["w null", { w: null }],
  ])("ignore un widget invalide : %s", (_, over) => {
    expect(parseLayout(payload([{ ...pw(), ...over }]))).toEqual([]);
  });

  it.each([null, 3, "x", [1]])("ignore l'entrée non objet %j", (item) => {
    expect(parseLayout(payload([item, pw()]))).toEqual([pw()]);
  });

  it("ignore un widget qui chevauche un précédent", () => {
    const res = parseLayout(payload([pw({ id: 1, w: 2, h: 2 }), pw({ id: 2, index: 4 }), pw({ id: 3, index: 2 })]));
    expect(res.map((w) => w.id)).toEqual([1, 3]);
  });

  it("ignore un id dupliqué (le premier est conservé)", () => {
    const res = parseLayout(payload([pw({ id: 1, index: 0 }), pw({ id: 1, index: 5, type: "bio" })]));
    expect(res).toEqual([pw({ id: 1, index: 0 })]);
  });

  it("remplace des settings invalides par un objet vide", () => {
    expect(parseLayout(payload([{ ...pw(), settings: "x" }]))[0].settings).toEqual({});
    expect(parseLayout(payload([{ ...pw(), settings: [1] }]))[0].settings).toEqual({});
    const sansSettings: Record<string, unknown> = { ...pw() };
    delete sansSettings.settings;
    expect(parseLayout(payload([sansSettings]))[0].settings).toEqual({});
  });

  it("ne conserve que les champs connus", () => {
    const res = parseLayout(payload([{ ...pw(), extra: "x" }]));
    expect(Object.keys(res[0]).sort()).toEqual(["h", "id", "index", "settings", "type", "w"]);
  });
});

describe("loadLayout / saveLayout", () => {
  it("sauvegarde puis relit via localStorage sous la clé versionnée", () => {
    saveLayout([pw()]);
    expect(JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY)!)).toEqual({ version: 1, widgets: [pw()] });
    expect(loadLayout()).toEqual([pw()]);
  });

  it("retourne [] quand rien n'est enregistré", () => expect(loadLayout()).toEqual([]));

  it("retourne [] si le contenu est corrompu", () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "{pas du json");
    expect(loadLayout()).toEqual([]);
  });

  it("ne plante pas si getItem lève une exception", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    expect(loadLayout()).toEqual([]);
  });

  it("ne plante pas si setItem lève une exception (quota plein)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => saveLayout([pw()])).not.toThrow();
  });
});

describe("slugifyName / exportFileName", () => {
  it.each([
    ["Yvan", "yvan"], ["Élodie Müller", "elodie-muller"], ["  DJ__Max!! ", "dj-max"],
    ["a/b\\c:d", "a-b-c-d"], ["../../etc", "etc"],
  ])("%j devient %j", (name, slug) => expect(slugifyName(name)).toBe(slug));

  it.each([undefined, null, "", "   ", "***", "日本語", 42])("%j retombe sur « profil »", (name) => {
    expect(slugifyName(name)).toBe("profil");
  });

  it("construit un nom de fichier sans jamais écrire « undefined »", () => {
    expect(exportFileName("year", undefined, 123)).toBe("mystats-year-profil-123.png");
    expect(exportFileName("month", "Élodie M.", 5)).toBe("mystats-month-elodie-m-5.png");
    expect(exportFileName("year", undefined, 1)).not.toContain("undefined");
  });
});
