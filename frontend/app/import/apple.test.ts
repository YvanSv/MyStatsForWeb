import { describe, expect, it } from "vitest";
import { AppleCSVRow } from "../data/DataInfos";
import { AppleRowError, appleRowToPlays, MAX_PLAYS_PER_ROW, MIN_PLAY_MS, toBatches, UPLOAD_BATCH_SIZE } from "./apple";

// Les écoutes sont envoyées en vrai UTC à partir de l'heure locale du navigateur : les attentes suivent le fuseau de la machine de test
const local = (y: number, mo: number, d: number, h: number, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).toISOString();

const row = (over: Partial<Record<keyof AppleCSVRow, string>> = {}): AppleCSVRow => ({
  "Track Identifier": "t1",
  "Track Description": "Daft Punk - One More Time",
  "Date Played": "20240131",
  Hours: "14",
  "Play Duration Milliseconds": "240000",
  "Play Count": "1",
  ...over,
}) as AppleCSVRow;

describe("appleRowToPlays – transformation", () => {
  it("crée autant d'écoutes que de lectures, réparties à la seconde dans l'heure", () => {
    const plays = appleRowToPlays(row({ "Play Count": "3", "Play Duration Milliseconds": "720000" }));
    expect(plays.map((p) => p.played_at)).toEqual([
      local(2024, 1, 31, 14, 0, 0),
      local(2024, 1, 31, 14, 0, 1),
      local(2024, 1, 31, 14, 0, 2),
    ]);
    expect(plays.every((p) => p.ms_played === 240000)).toBe(true);
  });

  it("sépare artiste et titre, y compris quand le titre contient ' - '", () => {
    expect(appleRowToPlays(row({ "Track Description": "Artiste - Titre - Remix" }))[0]).toMatchObject({
      artist_name: "Artiste", song_name: "Titre - Remix",
    });
    expect(appleRowToPlays(row({ "Track Description": "Seul" }))[0]).toMatchObject({
      artist_name: "", song_name: "Seul",
    });
  });

  it("traite un Play Count absent ou illisible comme 1", () => {
    expect(appleRowToPlays(row({ "Play Count": "" }))).toHaveLength(1);
    expect(appleRowToPlays(row({ "Play Count": "abc" }))).toHaveLength(1);
  });

  it("traite des Hours absentes comme minuit", () => {
    expect(appleRowToPlays(row({ Hours: "" }))[0].played_at).toBe(local(2024, 1, 31, 0, 0, 0));
  });

  it("met sur deux chiffres les mois, jours et heures", () => {
    expect(appleRowToPlays(row({ "Date Played": "20240305", Hours: "7" }))[0].played_at).toBe(local(2024, 3, 5, 7, 0, 0));
  });
});

describe("appleRowToPlays – lignes ignorées", () => {
  it("ignore une ligne sans identifiant de piste", () => {
    expect(appleRowToPlays(row({ "Track Identifier": "" }))).toEqual([]);
  });

  it("ignore une écoute de 30 s ou moins, garde juste au-dessus (valeur limite)", () => {
    expect(appleRowToPlays(row({ "Play Duration Milliseconds": String(MIN_PLAY_MS) }))).toEqual([]);
    expect(appleRowToPlays(row({ "Play Duration Milliseconds": String(MIN_PLAY_MS + 1) }))).toHaveLength(1);
  });

  it("ignore une durée absente ou négative", () => {
    expect(appleRowToPlays(row({ "Play Duration Milliseconds": "" }))).toEqual([]);
    expect(appleRowToPlays(row({ "Play Duration Milliseconds": "-5000" }))).toEqual([]);
  });

  it("ne lève aucune erreur de date pour une ligne ignorée", () => {
    expect(appleRowToPlays(row({ "Track Identifier": "", "Date Played": "n'importe quoi" }))).toEqual([]);
  });
});

describe("appleRowToPlays – Play Count borné", () => {
  const many = (count: number) => row({ "Play Count": String(count), "Play Duration Milliseconds": String(count * 40000) });

  it("garde toutes les écoutes jusqu'à 3600 (une par seconde), avec des minutes entre 00 et 59", () => {
    const plays = appleRowToPlays(many(MAX_PLAYS_PER_ROW));
    expect(plays).toHaveLength(3600);
    expect(plays[0].played_at).toBe(local(2024, 1, 31, 14, 0, 0));
    expect(plays[3599].played_at).toBe(local(2024, 1, 31, 14, 59, 59));
  });

  it("passe à la minute suivante après 60 écoutes", () => {
    const plays = appleRowToPlays(many(61));
    expect(plays[59].played_at).toBe(local(2024, 1, 31, 14, 0, 59));
    expect(plays[60].played_at).toBe(local(2024, 1, 31, 14, 1, 0));
  });

  it("plafonne une valeur aberrante à 3600 écoutes : jamais de minute ≥ 60 ni de saturation mémoire", () => {
    const plays = appleRowToPlays(many(1_000_000));
    expect(plays).toHaveLength(MAX_PLAYS_PER_ROW);
    const start = Date.parse(local(2024, 1, 31, 14, 0, 0));
    for (const p of plays) {
      const elapsed = Date.parse(p.played_at) - start;
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(3600_000);
    }
  });

  it("produit des dates valides pour tout l'intervalle (aucune « Invalid Date »)", () => {
    for (const p of appleRowToPlays(many(5000))) expect(Number.isNaN(new Date(p.played_at).getTime())).toBe(false);
  });
});

describe("appleRowToPlays – dates et heures invalides", () => {
  it.each([
    ["", "vide"],
    ["2024-01-31", "avec tirets"],
    ["240131", "trop courte"],
    ["abcdefgh", "non numérique"],
    ["20241331", "mois 13"],
    ["20240001", "mois 00"],
    ["20240132", "jour 32"],
    ["20240230", "30 février"],
    ["20230229", "29 février d'une année non bissextile"],
  ])("rejette la date %j (%s)", (date) => {
    expect(() => appleRowToPlays(row({ "Date Played": date }))).toThrow(AppleRowError);
    try { appleRowToPlays(row({ "Date Played": date })) } catch (e) { expect(e).toMatchObject({ kind: "date", value: date }) }
  });

  it("accepte le 29 février d'une année bissextile", () => {
    expect(appleRowToPlays(row({ "Date Played": "20240229" }))[0].played_at).toBe(local(2024, 2, 29, 14, 0, 0));
  });

  it.each(["24", "25", "-1", "99"])("rejette l'heure %j", (hours) => {
    expect(() => appleRowToPlays(row({ Hours: hours }))).toThrow(AppleRowError);
    try { appleRowToPlays(row({ Hours: hours })) } catch (e) { expect(e).toMatchObject({ kind: "hour", value: hours }) }
  });

  it.each(["0", "23"])("accepte l'heure limite %j", (hours) => {
    expect(() => appleRowToPlays(row({ Hours: hours }))).not.toThrow();
  });
});

describe("toBatches", () => {
  it("découpe en lots d'au plus la taille demandée, sans perte ni doublon", () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    const batches = toBatches(items, 5);
    expect(batches.map((b) => b.length)).toEqual([5, 5, 2]);
    expect(batches.flat()).toEqual(items);
  });

  it("renvoie aucun lot pour une liste vide", () => {
    expect(toBatches([])).toEqual([]);
  });

  it("un lot exactement plein ne produit pas de lot vide", () => {
    expect(toBatches([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("utilise par défaut la taille d'envoi du serveur (5000)", () => {
    expect(UPLOAD_BATCH_SIZE).toBe(5000);
    expect(toBatches(Array.from({ length: 5001 }, (_, i) => i)).map((b) => b.length)).toEqual([5000, 1]);
  });
});
