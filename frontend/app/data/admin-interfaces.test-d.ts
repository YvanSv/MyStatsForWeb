import { describe, expectTypeOf, it } from "vitest";
import type { CreateRequest, MatchData, MergeRequest, SuggestionMatch } from "./admin-interfaces";
import type { Track } from "./interfaces";

describe("MergeRequest", () => {
  it("accepte une demande de fusion telle que renvoyée par le backend", () => {
    const request = {
      id: 1, entity_type: "ARTIST", status: "PENDING", priority: "medium",
      duplicate_id: 12, target_id: 7, created_at: "2026-09-30T12:00:00", reason: "Doublon créé par l'import",
    } satisfies MergeRequest;
    expectTypeOf(request).toMatchTypeOf<MergeRequest>();
  });

  it("n'exige pas de raison", () => {
    expectTypeOf<{ id: number; entity_type: "TRACK"; status: "COMPLETED"; priority: "low"; duplicate_id: number; target_id: number; created_at: string }>()
      .toMatchTypeOf<MergeRequest>();
  });

  it("limite le type d'entité aux trois types du backend", () => {
    expectTypeOf<MergeRequest["entity_type"]>().toEqualTypeOf<"ARTIST" | "ALBUM" | "TRACK">();
  });

  it("limite le statut aux trois statuts du backend", () => {
    expectTypeOf<MergeRequest["status"]>().toEqualTypeOf<"PENDING" | "COMPLETED" | "REJECTED">();
  });

  it("limite la priorité à low, medium et high", () => {
    expectTypeOf<MergeRequest["priority"]>().toEqualTypeOf<"low" | "medium" | "high">();
  });

  it("utilise des identifiants numériques et une date ISO sous forme de chaîne", () => {
    expectTypeOf<MergeRequest["id"]>().toBeNumber();
    expectTypeOf<MergeRequest["duplicate_id"]>().toBeNumber();
    expectTypeOf<MergeRequest["target_id"]>().toBeNumber();
    expectTypeOf<MergeRequest["created_at"]>().toBeString();
    expectTypeOf<MergeRequest["reason"]>().toEqualTypeOf<string | undefined>();
  });

  it("refuse un type d'entité ou un statut inconnu", () => {
    expectTypeOf<{ entity_type: "PLAYLIST" }>().not.toMatchTypeOf<Pick<MergeRequest, "entity_type">>();
    expectTypeOf<{ status: "DONE" }>().not.toMatchTypeOf<Pick<MergeRequest, "status">>();
    expectTypeOf<{ priority: "urgent" }>().not.toMatchTypeOf<Pick<MergeRequest, "priority">>();
  });
});

describe("SuggestionMatch", () => {
  it("accepte une suggestion Spotify complète", () => {
    const suggestion = {
      id: "4uLU6hMCjMI75M1A2tKUQC", title: "Titre", artist: "Artiste", artist_id: "0oSGxfWSnnOXhD2fKuz2Gy",
      album: "Album", album_id: "2UJcKiJxNryhL050F5Z1Fk", image_url: "https://i.scdn.co/image/x",
      duration_ms: 210000, isrc: "USUM71703861", release_date: "2017-03-24",
    } satisfies SuggestionMatch;
    expectTypeOf(suggestion).toMatchTypeOf<SuggestionMatch>();
  });

  it("accepte une pochette, un ISRC et une date de sortie absents (null côté backend)", () => {
    const partial = {
      id: "x", title: "T", artist: "A", artist_id: "a", album: "B", album_id: "b",
      image_url: null, duration_ms: 1000, isrc: null, release_date: null,
    } satisfies SuggestionMatch;
    expectTypeOf(partial).toMatchTypeOf<SuggestionMatch>();
  });

  it("type les champs nullables comme string | null", () => {
    expectTypeOf<SuggestionMatch["image_url"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SuggestionMatch["isrc"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SuggestionMatch["release_date"]>().toEqualTypeOf<string | null>();
  });

  it("utilise des identifiants Spotify sous forme de chaîne et une durée en millisecondes", () => {
    expectTypeOf<SuggestionMatch["id"]>().toBeString();
    expectTypeOf<SuggestionMatch["artist_id"]>().toBeString();
    expectTypeOf<SuggestionMatch["album_id"]>().toBeString();
    expectTypeOf<SuggestionMatch["duration_ms"]>().toBeNumber();
    expectTypeOf<SuggestionMatch["length"]>().toEqualTypeOf<number | undefined>();
  });
});

describe("MatchData", () => {
  it("contient une liste de suggestions", () => {
    expectTypeOf<MatchData["suggestions"]>().toEqualTypeOf<SuggestionMatch[]>();
  });

  it("accepte une liste vide", () => {
    expectTypeOf<{ suggestions: [] }>().toMatchTypeOf<MatchData>();
  });
});

describe("CreateRequest", () => {
  it("accepte un élément de la liste (avec history_count et track)", () => {
    const item = {
      id: 1, track_id: 42, history_count: 12, match_data: { suggestions: [] },
      created_at: "2026-09-30T12:00:00", reason: "Incertitude de la création",
      track: { id: 42, title: "Titre", artist_id: null },
    } satisfies CreateRequest;
    expectTypeOf(item).toMatchTypeOf<CreateRequest>();
  });

  it("accepte le détail, qui ne renvoie pas history_count", () => {
    const detail = {
      id: 1, track_id: 42, match_data: { suggestions: [] }, created_at: "2026-09-30T12:00:00",
      track: { id: 42, title: "Titre", artist_id: 7, mappings: [], history: [] },
    } satisfies CreateRequest;
    expectTypeOf(detail).toMatchTypeOf<CreateRequest>();
  });

  it("rend history_count, reason et track facultatifs", () => {
    expectTypeOf<CreateRequest["history_count"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<CreateRequest["reason"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CreateRequest["track"]>().toEqualTypeOf<Track | undefined>();
  });

  it("exige l'identifiant de la piste et les données de correspondance", () => {
    expectTypeOf<CreateRequest["track_id"]>().toBeNumber();
    expectTypeOf<CreateRequest["match_data"]>().toEqualTypeOf<MatchData>();
    expectTypeOf<{ id: number }>().not.toMatchTypeOf<CreateRequest>();
  });
});
