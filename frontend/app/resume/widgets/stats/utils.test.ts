/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { formatNumber } from "./utils";

describe("formatNumber", () => {
  describe("sans abréviation", () => {
    it("renvoie 0 pour zéro", () => {
      expect(formatNumber(0, false)).toBe("0");
    });

    it("n'ajoute pas de séparateur sous 1000", () => {
      expect(formatNumber(999, false)).toBe("999");
    });

    it("sépare les milliers (séparateur quelconque)", () => {
      expect(formatNumber(1234567, false).replace(/\D/g, "")).toBe("1234567");
      expect(formatNumber(1234567, false)).not.toBe("1234567");
    });

    it("formate à la française : espace fine insécable (U+202F) entre les milliers", () => {
      // Le site est en français : "1 234 567" et non "1,234,567" (dépend de la locale de l'environnement)
      expect(formatNumber(1234567, false)).toBe("1 234 567");
    });

    it("gère les nombres négatifs", () => {
      expect(formatNumber(-5, false)).toBe("-5");
    });
  });

  describe("avec abréviation", () => {
    it.each([
      [0, "0"],
      [1, "1"],
      [999, "999"],
      [1000, "1.0k"],
      [1500, "1.5k"],
      [1949, "1.9k"],
      [12345, "12.3k"],
      [999000, "999.0k"],
      [1000000, "1.0M"],
      [1234567, "1.2M"],
      [25000000, "25.0M"],
      [1234000000, "1234.0M"],
    ])("%i devient %s", (n, expected) => {
      expect(formatNumber(n, true)).toBe(expected);
    });

    it("n'affiche jamais « 1000.0k » : 999999 s'arrondit en 1.0M", () => {
      // Défaut : (999999 / 1000).toFixed(1) === "1000.0"
      expect(formatNumber(999999, true)).toBe("1.0M");
    });

    it("garde un nombre négatif non abrégé", () => {
      expect(formatNumber(-5000, true).replace(/\D/g, "")).toBe("5000");
      expect(formatNumber(-5000, true)).toMatch(/^-/);
    });
  });

  it("traite une valeur absente (null/undefined) comme 0", () => {
    expect(formatNumber(null, false)).toBe("0");
    expect(formatNumber(undefined, true)).toBe("0");
  });
});
