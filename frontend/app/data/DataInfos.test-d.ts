import { describe, expectTypeOf, it } from "vitest";
import type { AppleCSVRow, CleanAppleData, DataInfo, EditableProfile, TopStatCardProps, UserProfile, UserProfileTops } from "./DataInfos";

/** Retire la signature d'index pour ne garder que les clés explicitement déclarées. */
type KnownKeys<T> = { [K in keyof T as string extends K ? never : K]: T[K] };

describe("DataInfo – éléments de classement renvoyés par /data/my et /data/all", () => {
  // Réponses réelles de l'API, auxquelles RankingView ajoute le type
  const track = {
    play_count: 210, total_minutes: 709, engagement: 96.01, rating: 1.6, id: 8477, title: "Marché noir",
    artist: "SCH", album: "Marché noir", cover: "https://i.scdn.co/image/ab67616d0000b273", duration_ms: 210952,
    type: "track",
  } satisfies DataInfo;
  const album = {
    play_count: 1701, total_minutes: 5285, engagement: 95.57, rating: 1.77, id: 3909, name: "Double Star",
    artist: "DTF", cover: "https://i.scdn.co/image/ab67616d0000b273", type: "album",
  } satisfies DataInfo;
  const artist = {
    play_count: 5104, total_minutes: 14152, engagement: 95.12, rating: 1.99, id: 1901, name: "Bekar",
    image_url: "https://i.scdn.co/image/ab6761610000e5eb", type: "artist",
  } satisfies DataInfo;

  it("accepte un titre, un album et un artiste tels que renvoyés par l'API", () => {
    expectTypeOf(track).toMatchTypeOf<DataInfo>();
    expectTypeOf(album).toMatchTypeOf<DataInfo>();
    expectTypeOf(artist).toMatchTypeOf<DataInfo>();
  });

  it("utilise un identifiant numérique (l'API renvoie des entiers, plus de spotify_id)", () => {
    expectTypeOf<DataInfo["id"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<DataInfo>().not.toHaveProperty("spotify_id");
  });

  it("exige les quatre statistiques et le type", () => {
    expectTypeOf<DataInfo["play_count"]>().toBeNumber();
    expectTypeOf<DataInfo["total_minutes"]>().toBeNumber();
    expectTypeOf<DataInfo["engagement"]>().toBeNumber();
    expectTypeOf<DataInfo["rating"]>().toBeNumber();
    expectTypeOf<DataInfo["type"]>().toEqualTypeOf<"track" | "album" | "artist">();
  });

  it("accepte un titre ou un artiste sans image (null côté API)", () => {
    expectTypeOf<{ type: "album"; play_count: number; total_minutes: number; engagement: number; rating: number; cover: null }>()
      .toMatchTypeOf<DataInfo>();
    expectTypeOf<{ type: "artist"; play_count: number; total_minutes: number; engagement: number; rating: number; image_url: null }>()
      .toMatchTypeOf<DataInfo>();
  });

  it("déclare la durée d'un titre (duration_ms) renvoyée par l'API", () => {
    expectTypeOf<DataInfo["duration_ms"]>().toEqualTypeOf<number | null | undefined>();
  });

  it("refuse un élément sans statistiques", () => {
    expectTypeOf<{ type: "track"; title: string }>().not.toMatchTypeOf<DataInfo>();
  });

  it("refuse un type d'élément inconnu", () => {
    expectTypeOf<{ type: "playlist"; play_count: number; total_minutes: number; engagement: number; rating: number }>()
      .not.toMatchTypeOf<DataInfo>();
  });

  it("distingue le nom d'un titre (title) du nom d'un album ou d'un artiste (name)", () => {
    expectTypeOf<DataInfo["title"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<DataInfo["name"]>().toEqualTypeOf<string | undefined>();
  });

  it("distingue la pochette (cover) de l'image d'artiste (image_url)", () => {
    expectTypeOf<DataInfo["cover"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<DataInfo["image_url"]>().toEqualTypeOf<string | null | undefined>();
  });
});

describe("AppleCSVRow – export « Play History Daily Tracks.csv »", () => {
  it("déclare exactement les colonnes lues par la page d'import", () => {
    expectTypeOf<keyof KnownKeys<AppleCSVRow>>().toEqualTypeOf<
      "Track Identifier" | "Track Description" | "Date Played" | "Hours" | "Play Duration Milliseconds" | "Play Count"
    >();
  });

  it("type toutes les colonnes comme du texte (lecture CSV brute)", () => {
    expectTypeOf<KnownKeys<AppleCSVRow>[keyof KnownKeys<AppleCSVRow>]>().toBeString();
  });

  it("tolère les autres colonnes de l'export", () => {
    expectTypeOf<AppleCSVRow["Country"]>().toBeString();
  });

  it("ne déclare plus les colonnes d'un autre format d'export, jamais lues", () => {
    expectTypeOf<KnownKeys<AppleCSVRow>>().not.toHaveProperty("Apple ID Number");
    expectTypeOf<KnownKeys<AppleCSVRow>>().not.toHaveProperty("Song Name");
    expectTypeOf<KnownKeys<AppleCSVRow>>().not.toHaveProperty("Event Start Timestamp");
  });
});

describe("CleanAppleData – lot envoyé à /import/apple", () => {
  it("accepte une écoute minimale (sans album ni durée)", () => {
    const play = {
      apple_track_id: "1234567", song_name: "Titre", artist_name: "Artiste",
      played_at: "2024-03-15T09:00:00.000Z", ms_played: 215000,
    } satisfies CleanAppleData;
    expectTypeOf(play).toMatchTypeOf<CleanAppleData>();
  });

  it("accepte l'album et la durée du titre quand ils sont connus", () => {
    const play = {
      apple_track_id: "1", song_name: "T", artist_name: "A", album_name: "B", track_duration: 240000,
      played_at: "2024-03-15T09:00:00.000Z", ms_played: 1000,
    } satisfies CleanAppleData;
    expectTypeOf(play).toMatchTypeOf<CleanAppleData>();
  });

  it("rend album_name et track_duration facultatifs (le backend ne les lit pas)", () => {
    expectTypeOf<CleanAppleData["album_name"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CleanAppleData["track_duration"]>().toEqualTypeOf<number | undefined>();
  });

  it("exige les cinq champs du schéma backend (AppleImportSchema)", () => {
    expectTypeOf<CleanAppleData["apple_track_id"]>().toBeString();
    expectTypeOf<CleanAppleData["song_name"]>().toBeString();
    expectTypeOf<CleanAppleData["artist_name"]>().toBeString();
    expectTypeOf<CleanAppleData["played_at"]>().toBeString();
    expectTypeOf<CleanAppleData["ms_played"]>().toBeNumber();
    expectTypeOf<{ song_name: string }>().not.toMatchTypeOf<CleanAppleData>();
  });
});

describe("profils", () => {
  it("UserProfile : les permissions couvrent les cinq sections du backend", () => {
    expectTypeOf<keyof UserProfile["perms"]>().toEqualTypeOf<"profile" | "stats" | "favorites" | "history" | "dashboard">();
    expectTypeOf<UserProfile["perms"]["stats"]>().toBeBoolean();
  });

  it("UserProfile : expose les tops et l'historique sous forme de listes", () => {
    expectTypeOf<UserProfile["top_50_tracks"]>().toBeArray();
    expectTypeOf<UserProfile["top_50_albums"]>().toBeArray();
    expectTypeOf<UserProfile["top_50_artists"]>().toBeArray();
    expectTypeOf<UserProfile["recent_tracks"]>().toBeArray();
  });

  it("UserProfile : statistiques numériques", () => {
    expectTypeOf<UserProfile["total_minutes"]>().toBeNumber();
    expectTypeOf<UserProfile["total_streams"]>().toBeNumber();
    expectTypeOf<UserProfile["peak_hour"]>().toBeNumber();
  });

  it("TopStatCardProps : décrit la carte d'un meilleur titre ou artiste", () => {
    expectTypeOf<TopStatCardProps["isTrack"]>().toBeBoolean();
    expectTypeOf<TopStatCardProps["rating"]>().toBeNumber();
    expectTypeOf<keyof TopStatCardProps>().toEqualTypeOf<"name" | "img_url" | "rating" | "isTrack" | "artist_name" | "album_name">();
  });

  it("UserProfileTops : un meilleur titre et un meilleur artiste", () => {
    expectTypeOf<UserProfileTops["top_track"]>().toEqualTypeOf<TopStatCardProps>();
    expectTypeOf<UserProfileTops["top_artist"]>().toEqualTypeOf<TopStatCardProps>();
  });

  it("EditableProfile : les quatre champs modifiables", () => {
    expectTypeOf<keyof EditableProfile>().toEqualTypeOf<"display_name" | "bio" | "avatar" | "banner">();
  });
});
