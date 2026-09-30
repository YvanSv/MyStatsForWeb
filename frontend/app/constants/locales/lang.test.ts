import { describe, expect, it } from "vitest";
import { en } from "./en";
import { fr } from "./fr";
import { languages } from "./lang";

describe("languages", () => {
  it("expose exactement le français et l'anglais", () => {
    expect(Object.keys(languages).sort()).toEqual(["en", "fr"]);
  });

  it("associe chaque code de langue à son dictionnaire", () => {
    expect(languages.fr).toBe(fr);
    expect(languages.en).toBe(en);
  });

  it("ne confond pas les deux langues", () => {
    expect(languages.fr).not.toBe(languages.en);
    expect(languages.fr.account.save).not.toBe(languages.en.account.save);
  });

  it("contient les sections attendues par l'application", () => {
    for (const lang of Object.values(languages)) {
      for (const section of ["account", "auth", "api", "header", "footer", "ranking", "charts", "common", "importData", "resume"]) {
        expect(lang).toHaveProperty(section);
      }
    }
  });
});
