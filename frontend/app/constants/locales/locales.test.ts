import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";

type Leaf = { path: string; value: unknown };

/** Aplatit un dictionnaire en liste de feuilles (« section.cle » -> valeur). */
const leaves = (obj: object, prefix = ""): Leaf[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? leaves(value, path)
      : [{ path, value }];
  });

const dictionaries = [["fr", fr], ["en", en]] as const;
const kind = (v: unknown) => (typeof v === "function" ? `fonction(${(v as (...a: unknown[]) => unknown).length})` : typeof v);

describe("dictionnaires fr / en – cohérence entre langues", () => {
  const frLeaves = leaves(fr);
  const enLeaves = leaves(en);
  const frPaths = new Set(frLeaves.map((l) => l.path));
  const enPaths = new Set(enLeaves.map((l) => l.path));

  it("ont exactement les mêmes clés", () => {
    expect([...frPaths].filter((p) => !enPaths.has(p))).toEqual([]);
    expect([...enPaths].filter((p) => !frPaths.has(p))).toEqual([]);
  });

  it("ont le même nombre de textes", () => {
    expect(frLeaves).toHaveLength(enLeaves.length);
  });

  it("ont le même type de valeur pour chaque clé (texte ou fonction, même arité)", () => {
    const enByPath = new Map(enLeaves.map((l) => [l.path, l.value]));
    const mismatches = frLeaves
      .filter((l) => kind(l.value) !== kind(enByPath.get(l.path)))
      .map((l) => `${l.path}: ${kind(l.value)} ≠ ${kind(enByPath.get(l.path))}`);
    expect(mismatches).toEqual([]);
  });

  it("ont les mêmes sections de premier niveau, dans le même ordre", () => {
    expect(Object.keys(en)).toEqual(Object.keys(fr));
  });

  it("ont les mêmes options de tri et de catégories", () => {
    expect(Object.keys(en.ranking.sortOptions)).toEqual(Object.keys(fr.ranking.sortOptions));
    expect(Object.keys(en.rankingcategories)).toEqual(Object.keys(fr.rankingcategories));
  });

  it("traduisent vraiment : la majorité des textes diffèrent d'une langue à l'autre", () => {
    const enByPath = new Map(enLeaves.map((l) => [l.path, l.value]));
    const strings = frLeaves.filter((l) => typeof l.value === "string");
    const translated = strings.filter((l) => l.value !== enByPath.get(l.path));
    expect(translated.length / strings.length).toBeGreaterThan(0.8);
  });
});

describe.each(dictionaries)("dictionnaire %s – qualité des textes", (_lang, dict) => {
  const all = leaves(dict);
  const strings = all.filter((l): l is { path: string; value: string } => typeof l.value === "string");
  const functions = all.filter((l): l is { path: string; value: (n: number) => string } => typeof l.value === "function");

  it("n'a aucun texte vide ou blanc (l'interface retomberait sur un texte codé en dur)", () => {
    expect(strings.filter((l) => l.value.trim() === "").map((l) => l.path)).toEqual([]);
  });

  it("n'a aucun résidu de développement (undefined, [object, TODO, {{ }}, ${ })", () => {
    const bad = strings.filter((l) => /undefined|\[object|TODO|FIXME|\{\{|\$\{|lorem ipsum/i.test(l.value));
    expect(bad.map((l) => l.path)).toEqual([]);
  });

  it("n'a aucun texte avec des espaces multiples consécutifs ou des retours à la ligne", () => {
    expect(strings.filter((l) => /\s{2,}|\n/.test(l.value)).map((l) => l.path)).toEqual([]);
  });

  it("n'a que des valeurs textuelles ou des fonctions (pas de nombres, tableaux, null…)", () => {
    const odd = all.filter((l) => typeof l.value !== "string" && typeof l.value !== "function");
    expect(odd.map((l) => `${l.path}: ${kind(l.value)}`)).toEqual([]);
  });

  it("a des noms de sections uniques et non vides", () => {
    const sections = Object.keys(dict);
    expect(new Set(sections).size).toBe(sections.length);
    for (const name of sections) expect(name.length).toBeGreaterThan(0);
  });

  it.each([[0], [1], [2], [42], [1000]])("fonctions de dictionnaire : le résultat contient %i", (n) => {
    expect(functions.length).toBeGreaterThan(0);
    for (const f of functions) {
      const out = f.value(n);
      expect(typeof out).toBe("string");
      expect(out.trim().length).toBeGreaterThan(0);
      expect(out).toContain(String(n));
    }
  });

  it("expose les fonctions de dictionnaire attendues", () => {
    expect(functions.map((f) => f.path).sort()).toEqual([
      "importData.dropzoneActive",
      "importData.successImport",
      "profilePage.unitDays",
    ]);
  });
});

describe("dictionnaires – locales de formatage", () => {
  it.each([
    ["fr", fr, "fr-FR"],
    ["en", en, "en-US"],
  ] as const)("%s utilise la locale %s pour les nombres et les dates", (_l, dict, tag) => {
    expect(dict.common.locale).toBe(tag);
    expect(dict.rankingcell.locale).toBe(tag);
  });

  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("%s : les locales sont des balises BCP 47 valides et supportées", (_l, dict) => {
    for (const tag of [dict.common.locale, dict.rankingcell.locale]) {
      expect(() => Intl.getCanonicalLocales(tag)).not.toThrow();
      expect(Intl.NumberFormat.supportedLocalesOf(tag)).toContain(tag);
    }
  });

  it("formate les nombres selon la langue (séparateurs différents)", () => {
    const fmt = (tag: string) => new Intl.NumberFormat(tag).format(1234.5).replace(/[  ]/g, " ");
    expect(fmt(fr.common.locale)).toBe("1 234,5");
    expect(fmt(en.common.locale)).toBe("1,234.5");
  });
});

describe.each(dictionaries)("dictionnaire %s – confirmations de la page compte", (_lang, dict) => {
  const a = dict.account;

  it("demande de taper le mot de confirmation affiché dans le message (suppression)", () => {
    expect(a.confirmDelete).toContain(`'${a.deleteValidation}'`);
  });

  it("demande de taper le mot de confirmation affiché dans le message (nettoyage)", () => {
    expect(a.confirmClear).toContain(`'${a.clearValidation}'`);
  });

  it("utilise deux mots de confirmation différents (on ne supprime pas le compte par erreur)", () => {
    expect(a.deleteValidation).not.toBe(a.clearValidation);
  });

  it("utilise des mots de confirmation en majuscules, sans espace", () => {
    for (const word of [a.deleteValidation, a.clearValidation]) {
      expect(word).toBe(word.toUpperCase());
      expect(word).toBe(word.trim());
      expect(word).not.toMatch(/\s/);
      expect(word.length).toBeGreaterThan(3);
    }
  });

  it("ne réutilise pas un mot de confirmation dans le message de l'autre action", () => {
    expect(a.confirmDelete).not.toContain(`'${a.clearValidation}'`);
    expect(a.confirmClear).not.toContain(`'${a.deleteValidation}'`);
  });
});

describe.each(dictionaries)("dictionnaire %s – sections utilisées par les écrans", (_lang, dict) => {
  it("propose un libellé pour chaque option de tri", () => {
    const keys = Object.keys(dict.ranking.sortOptions);
    expect(keys).toEqual(["name", "play_count", "total_minutes", "engagement", "rating"]);
    for (const key of keys) expect((dict.ranking.sortOptions as Record<string, string>)[key].length).toBeGreaterThan(0);
  });

  it("a une section « resume » complète, sans texte vide (libellés du partage)", () => {
    for (const key of ["title", "share", "download", "topArtist", "topTrack", "totalTime", "totalStreams"]) {
      expect((dict.resume as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
    }
  });

  it("a des libellés d'unités non vides dans les cellules de classement", () => {
    const c = dict.rankingcell;
    for (const text of [c.unknown, c.unitStreams, c.unitMinutes]) expect(text.trim().length).toBeGreaterThan(0);
  });

  it("a un message pour chaque erreur d'authentification Spotify", () => {
    for (const key of ["spotifyError1", "spotifyError2", "spotifyError3", "spotifyError4", "spotifyErrorTemplate"] as const) {
      expect(dict.auth[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("a des libellés différents pour les actions de suppression et de nettoyage", () => {
    expect(dict.account.cleardata).not.toBe(dict.account.deleteaccount);
  });

  it("a des états de statut API distincts", () => {
    expect(dict.api.statusActive).not.toBe(dict.api.statusRateLimited);
  });
});
