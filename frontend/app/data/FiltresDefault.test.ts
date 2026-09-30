import { afterEach, describe, expect, it, vi } from "vitest";

// DEFAULT_METADATA calcule date_max à l'import : on recharge le module à une date donnée
const load = async (now: string) => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  return (await import("./FiltresDefault")).DEFAULT_METADATA;
};

afterEach(() => vi.useRealTimers());

describe("DEFAULT_METADATA – structure", () => {
  it("a exactement les clés des métadonnées renvoyées par le backend (/metadata)", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    expect(Object.keys(meta).sort()).toEqual(["date_max", "date_min", "max_minutes", "max_rating", "max_streams"]);
  });

  it("a des bornes numériques strictement positives", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    for (const value of [meta.max_streams, meta.max_minutes, meta.max_rating]) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it("utilise des valeurs par défaut larges pour ne pas borner les curseurs avant le chargement", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    expect(meta.max_streams).toBe(100000);
    expect(meta.max_minutes).toBe(100000);
    expect(meta.max_rating).toBe(2);
  });
});

describe("DEFAULT_METADATA – dates", () => {
  it("date_min vaut le 1er janvier 2010", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    expect(meta.date_min).toBe("2010-01-01");
  });

  it("date_max est la date du jour au format AAAA-MM-JJ", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    expect(meta.date_max).toBe("2026-09-30");
    expect(meta.date_max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each([
    ["2024-02-29T00:00:00Z", "2024-02-29"], // année bissextile
    ["2025-12-31T23:59:59Z", "2025-12-31"],
    ["2026-01-01T00:00:00Z", "2026-01-01"],
  ])("date_max pour %s vaut %s", async (now, expected) => {
    const meta = await load(now);
    expect(meta.date_max).toBe(expected);
  });

  it("date_max est la date UTC, pas la date locale", async () => {
    const meta = await load("2026-09-30T23:30:00Z");
    expect(meta.date_max).toBe("2026-09-30");
  });

  it("a des dates valides, date_min avant date_max", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    expect(Number.isNaN(Date.parse(meta.date_min))).toBe(false);
    expect(Number.isNaN(Date.parse(meta.date_max))).toBe(false);
    expect(meta.date_min < meta.date_max).toBe(true);
  });

  it("est calculée une seule fois à l'import (ne suit pas l'horloge ensuite)", async () => {
    const meta = await load("2026-09-30T12:00:00Z");
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    expect(meta.date_max).toBe("2026-09-30");
  });

  it("est recalculée à chaque rechargement du module", async () => {
    const first = await load("2026-09-30T12:00:00Z");
    const second = await load("2027-03-01T12:00:00Z");
    expect(first.date_max).toBe("2026-09-30");
    expect(second.date_max).toBe("2027-03-01");
  });
});
