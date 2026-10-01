import { describe, expect, it } from "vitest";
import { authUrlFor, safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each([
    "/",
    "/account",
    "/my/tracks",
    "/my/tracks?sort=rating&direction=asc",
    "/profile/dashboard/yvan#top",
    "/all/artists?artist=Daft%20Punk",
  ])("accepte le chemin du site %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([null, undefined, ""])("renvoie null pour %j", (v) => {
    expect(safeRedirectPath(v)).toBeNull();
  });

  it.each([
    "https://evil.example",
    "http://evil.example/a",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "profile",
    "account",
    "/ok\nSet-Cookie: x=1",
    "/ok\r\n",
    "/a\u0000b",
  ])("refuse %j", (v) => {
    expect(safeRedirectPath(v)).toBeNull();
  });

  it("refuse la page de connexion elle-même (boucle)", () => {
    expect(safeRedirectPath("/auth")).toBeNull();
    expect(safeRedirectPath("/auth?redirect=/account")).toBeNull();
    expect(safeRedirectPath("/auth/sub")).toBeNull();
  });

  it("n'écarte pas un chemin qui commence seulement comme /auth", () => {
    expect(safeRedirectPath("/authors")).toBe("/authors");
  });

  it("refuse une valeur trop longue", () => {
    expect(safeRedirectPath("/" + "a".repeat(2048))).toBeNull();
    expect(safeRedirectPath("/" + "a".repeat(2000))).not.toBeNull();
  });
});

describe("authUrlFor", () => {
  it("encode le chemin d'origine dans le paramètre redirect", () => {
    expect(authUrlFor("/my/tracks?sort=rating")).toBe("/auth?redirect=%2Fmy%2Ftracks%3Fsort%3Drating");
  });

  it("renvoie /auth nu quand le chemin n'est pas acceptable", () => {
    expect(authUrlFor("https://evil.example")).toBe("/auth");
    expect(authUrlFor("/auth")).toBe("/auth");
    expect(authUrlFor("")).toBe("/auth");
  });

  it("est l'inverse de safeRedirectPath (aller-retour)", () => {
    const original = "/my/tracks?sort=rating&artist=Daft%20Punk";
    const redirect = new URL(authUrlFor(original), "http://x").searchParams.get("redirect");
    expect(safeRedirectPath(redirect)).toBe(original);
  });
});
