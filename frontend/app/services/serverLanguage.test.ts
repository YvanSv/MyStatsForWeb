import { beforeEach, describe, expect, it, vi } from "vitest";

// Fonction simple (pas un vi.fn) : une exception levée par un spy est remontée comme erreur de test
const h = vi.hoisted(() => ({ impl: (async () => new Headers()) as () => Promise<Headers> }));
vi.mock("next/headers", () => ({ headers: () => h.impl() }));

import { getServerLanguage, pickLanguage } from "./serverLanguage";

describe("pickLanguage", () => {
  it.each([
    ["en", "en"],
    ["en-US,en;q=0.9,fr;q=0.8", "en"],
    ["fr-FR,fr;q=0.9,en;q=0.8", "fr"],
    ["de-DE,de;q=0.9,en;q=0.5", "en"],
    ["EN-gb", "en"],
    [" en ; q=0.8 , fr", "en"],
  ])("%j -> %s", (header, expected) => {
    expect(pickLanguage(header)).toBe(expected);
  });

  it.each([null, undefined, "", "de", "*", ";;;", ",,", "q=1", "constructor", "__proto__,toString", "en;q=0", "en;q=abc,de"])(
    "%j : repli sur fr", (header) => {
      expect(pickLanguage(header)).toBe("fr");
    });

  it("ignore une langue refusée (q=0) au profit de la suivante", () => {
    expect(pickLanguage("en;q=0, fr")).toBe("fr");
    expect(pickLanguage("fr;q=0, en")).toBe("en");
  });
});

describe("getServerLanguage", () => {
  beforeEach(() => { h.impl = async () => new Headers(); });

  it("lit Accept-Language dans les en-têtes de la requête", async () => {
    h.impl = async () => new Headers({ "accept-language": "en-US,en;q=0.9" });
    expect(await getServerLanguage()).toBe("en");
  });

  it("français sans en-tête", async () => {
    expect(await getServerLanguage()).toBe("fr");
  });

  it("français si headers() échoue (hors requête)", async () => {
    h.impl = async () => { throw new Error("hors requête"); };
    expect(await getServerLanguage()).toBe("fr");
  });
});
