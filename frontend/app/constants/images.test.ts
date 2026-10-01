import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_BANNER, DEFAULT_BANNER_IMAGE, isDefaultBanner } from "./images";

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
  });
});
