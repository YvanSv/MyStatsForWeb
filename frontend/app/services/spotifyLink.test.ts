import { describe, expect, it } from "vitest";
import { SPOTIFY_WEB_URL } from "../constants/app";
import { spotifyHref } from "./spotifyLink";

describe("spotifyHref", () => {
  it("garde la page du titre quand elle est sur open.spotify.com", () => {
    expect(spotifyHref("https://open.spotify.com/track/abc123")).toBe("https://open.spotify.com/track/abc123");
  });

  it("replie sur le lecteur web quand l'adresse est absente, vide ou invalide", () => {
    for (const v of [undefined, null, "", "pas une url"]) expect(spotifyHref(v)).toBe(SPOTIFY_WEB_URL);
  });

  it("n'utilise jamais une adresse d'un autre domaine, d'un autre protocole ou imitant Spotify", () => {
    for (const v of [
      "https://evil.example/track/1",
      "http://open.spotify.com/track/1",
      "javascript:alert(1)",
      "https://open.spotify.com.evil.example/track/1",
      "https://evil.example/https://open.spotify.com/",
    ]) expect(spotifyHref(v)).toBe(SPOTIFY_WEB_URL);
  });
});
