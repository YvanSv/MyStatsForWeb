import { describe, expect, it } from "vitest";
import {
  RATING_AVERAGE, RATING_GOOD, formatMinutes, formatPercent, formatStat, formatStreams, getCellDisplay, isValidNumber, ratingColorClass, safeNumber, withUnit,
} from "./format";

describe("isValidNumber", () => {
  it.each([[0], [1], [-3], [1.5], [1e9]])("accepte %s", (v) => expect(isValidNumber(v)).toBe(true));

  it.each([[undefined], [null], [NaN], [Infinity], [-Infinity], ["12"], [{}], [[]], [true]])(
    "refuse %s", (v) => expect(isValidNumber(v)).toBe(false),
  );
});

describe("formatStat", () => {
  it.each([
    [1234.5, "fr-FR", "1 234,5"],
    [1234.5, "en-US", "1,234.5"],
    [0, "fr-FR", "0"],
    [-2, "fr-FR", "-2"],
  ])("formate %s en %s", (value, locale, expected) => {
    expect(formatStat(value, locale).replace(/[  ]/g, " ")).toBe(expected);
  });

  it.each([[undefined], [null], [NaN], [Infinity]])("renvoie un tiret pour %s", (v) => {
    expect(formatStat(v as number | null | undefined, "fr-FR")).toBe("-");
  });

  it("formate 0 (et non un tiret)", () => {
    expect(formatStat(0, "fr-FR")).toBe("0");
  });
});

describe("safeNumber", () => {
  it.each([[5, 5], [0, 0], [-1, -1], [2.5, 2.5]])("garde %s", (v, expected) => expect(safeNumber(v)).toBe(expected));

  it.each([[undefined], [null], [NaN], [Infinity], [-Infinity]])("renvoie 0 pour %s", (v) => {
    expect(safeNumber(v as number | null | undefined)).toBe(0);
  });
});

describe("formatStreams", () => {
  it("sépare les milliers selon la langue", () => {
    expect(formatStreams(1234567, "en-US")).toBe("1,234,567");
    expect(formatStreams(1234567, "fr-FR").replace(/\s/g, " ")).toBe("1 234 567");
  });

  it.each([[undefined], [null], [NaN]])("renvoie « - » pour %s", (v) => {
    expect(formatStreams(v as number | null | undefined, "fr-FR")).toBe("-");
  });

  it("garde 0", () => expect(formatStreams(0, "fr-FR")).toBe("0"));
});

describe("formatMinutes", () => {
  it("arrondit à l'unité et sépare les milliers", () => {
    expect(formatMinutes(678.6, "en-US")).toBe("679");
    expect(formatMinutes(12345.4, "en-US")).toBe("12,345");
  });

  it.each([[undefined], [null], [NaN], [Infinity]])("renvoie « - » pour %s (et non 0)", (v) => {
    expect(formatMinutes(v as number | null | undefined, "fr-FR")).toBe("-");
  });

  it("garde 0", () => expect(formatMinutes(0, "fr-FR")).toBe("0"));
});

describe("formatPercent", () => {
  it("ajoute le % et formate selon la langue", () => {
    expect(formatPercent(42.5, "fr-FR")).toBe("42,5%");
    expect(formatPercent(42.5, "en-US")).toBe("42.5%");
    expect(formatPercent(0, "fr-FR")).toBe("0%");
  });

  it.each([[undefined], [null], [NaN]])("renvoie « - » seul (jamais « -% ») pour %s", (v) => {
    expect(formatPercent(v as number | null | undefined, "fr-FR")).toBe("-");
  });
});

describe("withUnit", () => {
  it("accole l'unité à une valeur présente", () => expect(withUnit("679", "m")).toBe("679m"));
  it("laisse « - » sans unité", () => expect(withUnit("-", "m")).toBe("-"));
});

describe("seuils de note", () => {
  it("expose les seuils partagés", () => {
    expect(RATING_GOOD).toBe(1.35);
    expect(RATING_AVERAGE).toBe(0.8);
  });

  it.each([
    [1.35, "text2"], [3, "text2"], [1.349, "text-jaune"], [0.8, "text-jaune"],
    [0.799, "text-rouge"], [0, "text-rouge"], [-1, "text-rouge"],
    [undefined, "text-rouge"], [null, "text-rouge"], [NaN, "text-rouge"],
  ])("note %s -> %s", (rating, cls) => {
    expect(ratingColorClass(rating as number | null | undefined)).toBe(cls);
  });
});

describe("getCellDisplay", () => {
  it("artiste : nom, image_url et drapeau", () => {
    expect(getCellDisplay({ type: "artist", name: "A", image_url: "i.jpg" }, "?")).toEqual({ isArtist: true, displayName: "A", displayImage: "i.jpg" });
  });
  it("titre prioritaire sur le nom, cover prioritaire sur image_url", () => {
    expect(getCellDisplay({ type: "track", title: "T", name: "N", cover: "c", image_url: "i" }, "?")).toEqual({ isArtist: false, displayName: "T", displayImage: "c" });
  });
  it("repli sur le libellé inconnu et image absente", () => {
    expect(getCellDisplay({ type: "album", cover: null }, "Inconnu")).toEqual({ isArtist: false, displayName: "Inconnu", displayImage: undefined });
  });
});
