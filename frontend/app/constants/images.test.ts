import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_BANNER, DEFAULT_BANNER_IMAGE, NOISE_TEXTURE, PLACEHOLDER_IMAGE, defaultAvatar, isDefaultBanner } from "./images";

describe("isDefaultBanner", () => {
  it.each([[null], [undefined], [""], [DEFAULT_BANNER]])("%j est la bannière par défaut", (value) => {
    expect(isDefaultBanner(value)).toBe(true);
  });

  it.each([["https://img/b.png"], ["data:image/png;base64,AAAA"], ["/autre.jpg"]])("%s n'est pas la bannière par défaut", (value) => {
    expect(isDefaultBanner(value)).toBe(false);
  });
});

describe("images par défaut", () => {
  it("les fichiers existent dans /public", () => {
    const pub = path.resolve(import.meta.dirname, "../../public");
    expect(fs.existsSync(path.join(pub, DEFAULT_BANNER_IMAGE))).toBe(true);
    expect(fs.existsSync(path.join(pub, NOISE_TEXTURE))).toBe(true);
    expect(fs.existsSync(path.join(pub, PLACEHOLDER_IMAGE))).toBe(true);
  });
});

describe("defaultAvatar", () => {
  const svgOf = (uri: string) => decodeURIComponent(uri.replace("data:image/svg+xml;charset=utf-8,", ""));

  it("génère un SVG local avec l'initiale en majuscule", () => {
    const uri = defaultAvatar("yvan");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(svgOf(uri)).toContain(">Y</text>");
  });

  it.each([[null], [undefined], [""], ["   "]])("%j donne ?", (name) => {
    expect(svgOf(defaultAvatar(name))).toContain(">?</text>");
  });

  it("accepte un nombre", () => {
    expect(svgOf(defaultAvatar(42))).toContain(">4</text>");
  });

  it("neutralise les caractères spéciaux du SVG", () => {
    for (const c of ["<", ">", "&", '"', "'"]) expect(svgOf(defaultAvatar(c))).toContain(">?</text>");
  });
});
