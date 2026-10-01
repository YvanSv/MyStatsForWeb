import { describe, expect, it } from "vitest";
import * as v from "./validation";

describe("limites de saisie", () => {
  it("les bornes min/max sont cohérentes", () => {
    expect(v.NAME_MIN).toBeLessThan(v.NAME_MAX);
    expect(v.PASSWORD_MIN).toBeLessThan(v.PASSWORD_MAX);
  });

  it.each([
    ["nom", v.NAME_MIN, v.NAME_WARN, v.NAME_DANGER, v.NAME_MAX],
    ["bio", 0, v.BIO_WARN, v.BIO_DANGER, v.BIO_MAX],
    ["mot de passe", v.PASSWORD_MIN, v.PASSWORD_WARN, v.PASSWORD_DANGER, v.PASSWORD_MAX],
  ])("%s : min < avertissement < danger < max", (_n, min, warn, danger, max) => {
    expect(min).toBeLessThan(warn);
    expect(warn).toBeLessThan(danger);
    expect(danger).toBeLessThan(max);
  });

  it("valeurs attendues par le serveur", () => {
    expect([v.NAME_MIN, v.NAME_MAX, v.BIO_MAX, v.PASSWORD_MIN, v.PASSWORD_MAX]).toEqual([3, 20, 500, 8, 128]);
    expect(v.MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
  });
});
