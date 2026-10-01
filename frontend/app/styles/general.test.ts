import { describe, expect, it } from "vitest";
import { BASE_UI, GENERAL_STYLES } from "./general";

// Toutes les valeurs de chaîne d'un objet imbriqué, avec leur chemin
const leaves = (obj: unknown, path = ""): [string, unknown][] =>
  obj !== null && typeof obj === "object"
    ? Object.entries(obj).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
    : [[path, obj]];

const classTokens = (value: string) => value.split(/\s+/).filter(Boolean);

describe.each([
  ["BASE_UI", BASE_UI],
  ["GENERAL_STYLES", GENERAL_STYLES],
])("%s – qualité des classes", (_name, styles) => {
  const all = leaves(styles);

  it("ne contient que des chaînes non vides", () => {
    for (const [path, value] of all) {
      expect(typeof value, path).toBe("string");
      expect((value as string).trim().length, path).toBeGreaterThan(0);
    }
  });

  it("n'a aucun reste d'interpolation (undefined, null, false, [object Object], ${…})", () => {
    for (const [path, value] of all) {
      for (const token of classTokens(value as string)) {
        expect(token, path).not.toMatch(/undefined|null|\[object|\$\{|^false$|^true$/);
      }
    }
  });

  it("n'a ni espaces en début/fin ni sauts de ligne", () => {
    for (const [path, value] of all) {
      expect(value, path).toBe((value as string).trim());
      expect(value as string, path).not.toMatch(/\n/);
    }
  });

  it("n'a pas de classe en double au sein d'une même valeur", () => {
    for (const [path, value] of all) {
      const tokens = classTokens(value as string);
      expect(new Set(tokens).size, path).toBe(tokens.length);
    }
  });
});

describe("BASE_UI", () => {
  it("expose les groupes attendus", () => {
    expect(Object.keys(BASE_UI).sort()).toEqual(["anim", "common", "layout", "rounded", "text", "typo"]);
  });

  it("garde les clés utilisées par l'application", () => {
    expect(BASE_UI.rounded).toHaveProperty("card");
    expect(BASE_UI.rounded).toHaveProperty("badge");
    expect(BASE_UI.rounded).toHaveProperty("input");
    expect(BASE_UI.rounded).toHaveProperty("item");
    expect(BASE_UI.rounded).toHaveProperty("medium");
    expect(BASE_UI.anim).toHaveProperty("base");
    expect(BASE_UI.common).toHaveProperty("flexCenter");
  });

  it("les classes d'arrondi commencent toutes par « rounded »", () => {
    for (const v of Object.values(BASE_UI.rounded)) expect(v).toMatch(/^rounded/);
  });

  it("les classes de texte commencent toutes par « text- »", () => {
    for (const v of Object.values(BASE_UI.text)) expect(v).toMatch(/^text-/);
  });

  it("flexCenter est identique dans common et layout", () => {
    expect(BASE_UI.common.flexCenter).toBe(BASE_UI.layout.flexCenter);
  });

  it("anim.click est cliquable (curseur pointeur)", () => {
    expect(BASE_UI.anim.click).toContain("cursor-pointer");
  });
});

describe("GENERAL_STYLES", () => {
  it("TRANSITION_TEXT_VERT passe au vert au survol, avec une classe écrite en entier", () => {
    expect(GENERAL_STYLES.TRANSITION_TEXT_VERT).toBe("transition-colors duration-300 hover:text-vert");
    expect(`hover:${BASE_UI.text.vert}`).toBe("hover:text-vert");
  });

  it("TRANSITION_ZOOM reprend l'animation de zoom au survol", () => {
    expect(GENERAL_STYLES.TRANSITION_ZOOM).toBe(BASE_UI.anim.hoverZoom);
  });
});
