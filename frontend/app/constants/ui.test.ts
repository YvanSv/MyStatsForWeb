import { describe, expect, it } from "vitest";
import * as ui from "./ui";

describe("ui", () => {
  it("breakpoint desktop = lg de Tailwind", () => {
    expect(ui.DESKTOP_BREAKPOINT).toBe(1024);
  });

  it("pagination et tri par défaut", () => {
    expect(ui.DEFAULT_PAGE_OFFSET).toBe(0);
    expect(ui.DEFAULT_PAGE_SIZE).toBe(50);
    expect(ui.DEFAULT_SORT).toBe("play_count");
    expect(ui.DEFAULT_DIRECTION).toBe("desc");
  });

  it("graphiques plus hauts sur desktop", () => {
    expect(ui.CHART_HEIGHT_MOBILE).toBe(200);
    expect(ui.CHART_HEIGHT_DESKTOP).toBe(250);
    expect(ui.CHART_HEIGHT_MOBILE).toBeLessThan(ui.CHART_HEIGHT_DESKTOP);
  });

  it("seuils de note ordonnés", () => {
    expect(ui.RATING_GOOD).toBeGreaterThan(ui.RATING_AVERAGE);
  });

  it("couleurs au format hexadécimal", () => {
    for (const c of Object.values(ui.COLORS)) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(ui.COLORS.SPOTIFY_GREEN).toBe("#1DB954");
  });

  it("style des toasts basé sur la couleur de surface", () => {
    expect(ui.TOAST_STYLE.background).toBe(ui.COLORS.SURFACE);
    expect(ui.TOAST_STYLE.borderRadius).toBe("15px");
  });
});
