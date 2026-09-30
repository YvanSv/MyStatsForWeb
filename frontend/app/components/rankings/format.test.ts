import { describe, expect, it } from "vitest";
import { formatStat, isValidNumber, safeNumber } from "./format";

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
