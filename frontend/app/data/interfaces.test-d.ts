import { describe, expectTypeOf, it } from "vitest";
import type { Album, AlbumMapping, Artist, ArtistMapping, Track, TrackHistory, TrackMapping } from "./interfaces";

describe("Artist", () => {
  it("accepte un artiste tel que renvoyé par le backend (sans relations)", () => {
    const artist = { id: 1901, name: "Bekar", image_url: "https://i.scdn.co/image/ab6761610000e5eb" } satisfies Artist;
    expectTypeOf(artist).toMatchTypeOf<Artist>();
  });

  it("accepte un artiste sans image (null en base)", () => {
    const artist = { id: 1, name: "Inconnu", image_url: null } satisfies Artist;
    expectTypeOf(artist).toMatchTypeOf<Artist>();
  });

  it("utilise un identifiant numérique (clé interne, plus l'ID Spotify)", () => {
    expectTypeOf<Artist["id"]>().toBeNumber();
    expectTypeOf<Artist["name"]>().toBeString();
  });

  it("type image_url comme string | null | undefined", () => {
    expectTypeOf<Artist["image_url"]>().toEqualTypeOf<string | null | undefined>();
  });

  it("expose ses relations comme listes facultatives", () => {
    expectTypeOf<Artist["albums"]>().toEqualTypeOf<Album[] | undefined>();
    expectTypeOf<Artist["tracks"]>().toEqualTypeOf<Track[] | undefined>();
    expectTypeOf<Artist["mappings"]>().toEqualTypeOf<ArtistMapping[] | undefined>();
  });

  it("refuse un identifiant sous forme de chaîne", () => {
    expectTypeOf<{ id: string; name: string }>().not.toMatchTypeOf<Artist>();
  });
});

describe("Album", () => {
  it("accepte un album tel que renvoyé par le backend", () => {
    const album = { id: 3909, name: "Double Star", image_url: "https://i.scdn.co/image/x", artist_id: 1918 } satisfies Album;
    expectTypeOf(album).toMatchTypeOf<Album>();
  });

  it("exige l'identifiant de l'artiste", () => {
    expectTypeOf<Album["artist_id"]>().toBeNumber();
    expectTypeOf<{ id: number; name: string }>().not.toMatchTypeOf<Album>();
  });

  it("type image_url comme string | null | undefined", () => {
    expectTypeOf<Album["image_url"]>().toEqualTypeOf<string | null | undefined>();
  });

  it("relie l'album à son artiste, ses titres et ses correspondances", () => {
    expectTypeOf<Album["artist"]>().toEqualTypeOf<Artist | undefined>();
    expectTypeOf<Album["tracks"]>().toEqualTypeOf<Track[] | undefined>();
    expectTypeOf<Album["mappings"]>().toEqualTypeOf<AlbumMapping[] | undefined>();
  });
});

describe("Track", () => {
  it("accepte un titre complet", () => {
    const track = { id: 8477, title: "Marché noir", duration_ms: 210952, artist_id: 12, album_id: 34 } satisfies Track;
    expectTypeOf(track).toMatchTypeOf<Track>();
  });

  it("accepte un titre importé d'Apple Music dont l'artiste n'est pas encore identifié (artist_id null)", () => {
    const track = { id: 9000, title: "Artiste - Titre", duration_ms: null, artist_id: null, album_id: null } satisfies Track;
    expectTypeOf(track).toMatchTypeOf<Track>();
  });

  it("accepte un titre sans album ni durée", () => {
    const track = { id: 1, title: "T", artist_id: 1 } satisfies Track;
    expectTypeOf(track).toMatchTypeOf<Track>();
  });

  it("type artist_id comme number | null (obligatoire mais nullable)", () => {
    expectTypeOf<Track["artist_id"]>().toEqualTypeOf<number | null>();
  });

  it("type album_id et duration_ms comme facultatifs et nullables", () => {
    expectTypeOf<Track["album_id"]>().toEqualTypeOf<number | null | undefined>();
    expectTypeOf<Track["duration_ms"]>().toEqualTypeOf<number | null | undefined>();
  });

  it("utilise title (et non name) pour le nom d'un titre", () => {
    expectTypeOf<Track["title"]>().toBeString();
    expectTypeOf<Track>().not.toHaveProperty("name");
  });

  it("expose l'historique et les correspondances comme listes facultatives", () => {
    expectTypeOf<Track["history"]>().toEqualTypeOf<TrackHistory[] | undefined>();
    expectTypeOf<Track["mappings"]>().toEqualTypeOf<TrackMapping[] | undefined>();
    expectTypeOf<Track["artist"]>().toEqualTypeOf<Artist | undefined>();
    expectTypeOf<Track["album"]>().toEqualTypeOf<Album | undefined>();
  });
});

describe("TrackHistory", () => {
  it("accepte une écoute telle que renvoyée par le backend", () => {
    const play = {
      id: 1, played_at: "2026-09-30T10:15:00", ms_played: 180000, provider: "SPOTIFY", user_id: 1, track_id: 8477,
    } satisfies TrackHistory;
    expectTypeOf(play).toMatchTypeOf<TrackHistory>();
  });

  it("représente la date comme une chaîne ISO et la durée en millisecondes", () => {
    expectTypeOf<TrackHistory["played_at"]>().toBeString();
    expectTypeOf<TrackHistory["ms_played"]>().toBeNumber();
  });

  it("identifie le titre par track_id (et non par un ID Spotify)", () => {
    expectTypeOf<TrackHistory["track_id"]>().toBeNumber();
    expectTypeOf<TrackHistory>().not.toHaveProperty("spotify_id");
  });

  it("garde le fournisseur d'origine de l'écoute", () => {
    expectTypeOf<TrackHistory["provider"]>().toBeString();
    expectTypeOf<TrackHistory["user_id"]>().toBeNumber();
  });

  it("joint facultativement le titre", () => {
    expectTypeOf<TrackHistory["track"]>().toEqualTypeOf<Track | undefined>();
  });
});

describe("correspondances (mappings)", () => {
  it("décrivent l'identifiant d'un fournisseur pour une entité interne", () => {
    const artist = { id: 1, provider: "SPOTIFY", provider_id: "0oSGxfWSnnOXhD2fKuz2Gy", artist_id: 1901 } satisfies ArtistMapping;
    const album = { id: 2, provider: "APPLE_MUSIC", provider_id: "123456", album_id: 3909 } satisfies AlbumMapping;
    const track = { id: 3, provider: "ISRC", provider_id: "USUM71703861", track_id: 8477 } satisfies TrackMapping;
    expectTypeOf(artist).toMatchTypeOf<ArtistMapping>();
    expectTypeOf(album).toMatchTypeOf<AlbumMapping>();
    expectTypeOf(track).toMatchTypeOf<TrackMapping>();
  });

  it("référencent l'entité par un identifiant interne numérique", () => {
    expectTypeOf<ArtistMapping["artist_id"]>().toBeNumber();
    expectTypeOf<AlbumMapping["album_id"]>().toBeNumber();
    expectTypeOf<TrackMapping["track_id"]>().toBeNumber();
  });

  it("gardent l'identifiant du fournisseur sous forme de chaîne", () => {
    expectTypeOf<ArtistMapping["provider_id"]>().toBeString();
    expectTypeOf<AlbumMapping["provider_id"]>().toBeString();
    expectTypeOf<TrackMapping["provider_id"]>().toBeString();
  });

  it("exigent une clé vers l'entité correspondante", () => {
    expectTypeOf<{ id: number; provider: string; provider_id: string }>().not.toMatchTypeOf<ArtistMapping>();
    expectTypeOf<{ id: number; provider: string; provider_id: string }>().not.toMatchTypeOf<AlbumMapping>();
    expectTypeOf<{ id: number; provider: string; provider_id: string }>().not.toMatchTypeOf<TrackMapping>();
  });
});
