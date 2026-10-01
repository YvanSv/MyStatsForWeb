import { describe, expect, it } from "vitest";
import * as t from "./timing";

describe("délais", () => {
  it("sont tous des entiers positifs en millisecondes", () => {
    for (const value of Object.values(t)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it("valeurs attendues", () => {
    expect(t.CURRENTLY_PLAYING_POLL_MS).toBe(15_000);
    expect(t.PLAYBACK_TICK_MS).toBe(1_000);
    expect(t.REFRESH_AFTER_ACTION_MS).toBe(500);
    expect(t.SPOTIFY_ERROR_TOAST_MS).toBe(5_000);
    expect(t.STATUS_POLL_MS).toBe(60_000);
    expect(t.STATUS_TICK_MS).toBe(1_000);
  });

  it("le tick de progression est plus court que le polling", () => {
    expect(t.PLAYBACK_TICK_MS).toBeLessThan(t.CURRENTLY_PLAYING_POLL_MS);
    expect(t.STATUS_TICK_MS).toBeLessThan(t.STATUS_POLL_MS);
  });
});
