import { describe, expect, it } from "vitest";
import { seasonEnd, seasonOfMonth, seasonStart } from "./seasons";

const d = (y: number, m: number, day = 15) => new Date(y, m - 1, day, 12);
const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

describe("seasonOfMonth", () => {
  it.each([
    [0, 0], [1, 0], [2, 1], [3, 1], [4, 1], [5, 2], [6, 2], [7, 2], [8, 3], [9, 3], [10, 3], [11, 0],
  ])("le mois %i (0 = janvier) est dans la saison %i", (month, season) => {
    expect(seasonOfMonth(month)).toBe(season);
  });
});

describe("seasonStart", () => {
  it.each([
    [d(2026, 12), "2026-12-01"], // décembre : l'hiver commence ce mois-ci
    [d(2026, 1), "2025-12-01"],  // janvier : l'hiver a commencé en décembre de l'année précédente
    [d(2026, 2, 28), "2025-12-01"],
    [d(2026, 3, 1), "2026-03-01"],
    [d(2026, 5, 31), "2026-03-01"],
    [d(2026, 6), "2026-06-01"],
    [d(2026, 8), "2026-06-01"],
    [d(2026, 9), "2026-09-01"],
    [d(2026, 10), "2026-09-01"],
    [d(2026, 11, 30), "2026-09-01"],
  ])("pour %s, la saison courante commence le %s", (ref, expected) => {
    expect(ymd(seasonStart(ref))).toBe(expected);
  });

  it("commence à minuit, heure locale", () => {
    const s = seasonStart(d(2026, 10));
    expect([s.getHours(), s.getMinutes(), s.getSeconds(), s.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it("recule d'une saison par unité d'offset négative, y compris à cheval sur deux années", () => {
    expect(ymd(seasonStart(d(2026, 10), -1))).toBe("2026-06-01");
    expect(ymd(seasonStart(d(2026, 10), -2))).toBe("2026-03-01");
    expect(ymd(seasonStart(d(2026, 10), -3))).toBe("2025-12-01");
    expect(ymd(seasonStart(d(2026, 10), -4))).toBe("2025-09-01");
  });

  it("avance avec un offset positif", () => {
    expect(ymd(seasonStart(d(2026, 10), 1))).toBe("2026-12-01");
    expect(ymd(seasonStart(d(2026, 10), 2))).toBe("2027-03-01");
  });

  it("en janvier, l'offset -1 donne l'automne précédent", () => {
    expect(ymd(seasonStart(d(2026, 1), -1))).toBe("2025-09-01");
  });
});

describe("seasonEnd", () => {
  it.each([
    ["2025-12-01", "2026-02-28"],
    ["2023-12-01", "2024-02-29"], // année bissextile
    ["2026-03-01", "2026-05-31"],
    ["2026-06-01", "2026-08-31"],
    ["2026-09-01", "2026-11-30"],
  ])("la saison commençant le %s se termine le %s", (start, end) => {
    const [y, m, day] = start.split("-").map(Number);
    expect(ymd(seasonEnd(new Date(y, m - 1, day)))).toBe(end);
  });

  it("se termine à 23:59:59.999", () => {
    const e = seasonEnd(new Date(2026, 5, 1));
    expect([e.getHours(), e.getMinutes(), e.getSeconds(), e.getMilliseconds()]).toEqual([23, 59, 59, 999]);
  });

  it("couvre sans trou ni chevauchement les saisons consécutives", () => {
    let start = seasonStart(d(2026, 10), -8);
    for (let i = 0; i < 16; i++) {
      const next = seasonStart(start, 1);
      expect(seasonEnd(start).getTime() + 1).toBe(next.getTime());
      start = next;
    }
  });
});
