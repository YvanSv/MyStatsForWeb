import { describe, expect, it } from "vitest";
import { languages } from "../constants/locales/lang";
import { COLOR_NAME_KEYS, colorLabel } from "./colorNames";

describe("colorLabel", () => {
  it("donne le nom traduit d'une couleur connue, sans tenir compte de la casse", () => {
    expect(colorLabel(languages.fr.resume, "#1DB954", 0)).toBe(languages.fr.resume.colorGreen);
    expect(colorLabel(languages.fr.resume, "#1db954", 0)).toBe(languages.fr.resume.colorGreen);
    expect(colorLabel(languages.en.resume, "#FFFFFF", 3)).toBe(languages.en.resume.colorWhite);
  });

  it("numérote une couleur inconnue à partir de 1, sans afficher l'hexadécimal", () => {
    const label = colorLabel(languages.fr.resume, "#123456", 2);
    expect(label).toBe(`${languages.fr.resume.wColor} 3`);
    expect(label).not.toContain("#");
  });

  it("chaque clé de la table existe dans les deux dictionnaires avec un texte non vide", () => {
    for (const key of Object.values(COLOR_NAME_KEYS))
      for (const lang of ["fr", "en"] as const)
        expect(languages[lang].resume[key].trim().length).toBeGreaterThan(0);
  });
});
