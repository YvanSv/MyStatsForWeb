import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it.each([[undefined], [null], [""], ["pas une date"], [NaN]])("renvoie « — » pour %s", (v) => {
    expect(formatDate(v as any, "fr-FR")).toBe("—");
  });

  it("formate une date ISO selon la locale", () => {
    expect(formatDate("2026-03-05T12:00:00", "fr-FR")).toBe("05/03/2026");
    expect(formatDate("2026-03-05T12:00:00", "en-US")).toBe("3/5/2026");
  });

  it("applique les options", () => {
    expect(formatDate("2026-03-05T12:00:00", "fr-FR", { day: "2-digit", month: "long", year: "numeric" })).toBe("05 mars 2026");
  });

  it("accepte un objet Date et un timestamp", () => {
    const d = new Date(2026, 0, 2, 12);
    expect(formatDate(d, "fr-FR")).toBe("02/01/2026");
    expect(formatDate(d.getTime(), "fr-FR")).toBe("02/01/2026");
  });
});
