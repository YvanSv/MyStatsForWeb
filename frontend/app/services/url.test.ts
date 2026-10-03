import { describe, expect, it } from "vitest";
import { itemDetailPath, itemRankingPath, pathSegment } from "./url";

describe("pathSegment", () => {
  it.each([["yvan", "yvan"], ["mon-slug-2", "mon-slug-2"], ["42", "42"]])("laisse %s inchangé", (value, expected) => {
    expect(pathSegment(value)).toBe(expected);
  });

  it("accepte un nombre", () => {
    expect(pathSegment(42)).toBe("42");
  });

  it.each([
    ["a/b", "a%2Fb"],
    ["a?x=1", "a%3Fx%3D1"],
    ["a#frag", "a%23frag"],
    ["../admin", "..%2Fadmin"],
    ["a b", "a%20b"],
    ["a&b", "a%26b"],
  ])("encode %j : un séparateur ne change pas la route appelée", (value, expected) => {
    expect(pathSegment(value)).toBe(expected);
  });

  it("n'encode pas deux fois une valeur déjà encodée", () => {
    expect(pathSegment("caf%C3%A9")).toBe("caf%C3%A9");
    expect(pathSegment("a%2Fb")).toBe("a%2Fb");
  });

  it("encode les caractères accentués bruts", () => {
    expect(pathSegment("café")).toBe("caf%C3%A9");
  });

  it("ne plante pas sur un « % » isolé ou une séquence invalide", () => {
    expect(pathSegment("100%")).toBe("100%25");
    expect(pathSegment("%E0%A4%A")).toBe("%25E0%25A4%25A");
  });

  it("renvoie une chaîne vide pour une valeur vide", () => {
    expect(pathSegment("")).toBe("");
  });
});

describe("itemDetailPath / itemRankingPath", () => {
  it.each([
    ["track", 12, "/my/tracks/12"],
    ["album", "7", "/my/albums/7"],
    ["artist", 3, "/my/artists/3"],
  ] as const)("%s %s -> %s", (type, id, expected) => {
    expect(itemDetailPath(type, id)).toBe(expected);
  });

  it("encode l'identifiant sans le ré-encoder", () => {
    expect(itemDetailPath("track", "a/b")).toBe("/my/tracks/a%2Fb");
    expect(itemDetailPath("track", "caf%C3%A9")).toBe("/my/tracks/caf%C3%A9");
  });

  it.each([["track", "/my/tracks"], ["album", "/my/albums"], ["artist", "/my/artists"]] as const)(
    "classement de %s : %s", (type, expected) => expect(itemRankingPath(type)).toBe(expected));
});
