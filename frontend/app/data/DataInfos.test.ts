import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import type { AppleCSVRow } from "./DataInfos";

// Colonnes de l'export Apple lues par la page d'import (import/page.tsx) : la liste est
// contrainte par le type AppleCSVRow, et DataInfos.test-d.ts vérifie qu'il ne déclare rien d'autre
const REQUIRED_COLUMNS = [
  "Track Identifier", "Track Description", "Date Played", "Hours", "Play Duration Milliseconds", "Play Count",
] as const satisfies readonly (keyof AppleCSVRow)[];

// Extrait représentatif de « Play History Daily Tracks.csv » (export Apple Music)
const HEADER =
  "Country,Track Identifier,Media type,Date Played,Hours,Play Duration Milliseconds,Source Type,Play Count,Skip Count,Ignore For Recommendations,Track Reference,Track Description";
const ROWS = [
  "FR,1445167429,AUDIO,20240315,9,512000,ITUNES_MATCH,2,0,false,1445167429,Laylow - Dehors dans la night",
  "FR,1612345678,AUDIO,20240315,23,215000,APPLE_MUSIC,1,0,false,1612345678,SCH - Marché noir",
  'FR,1700000001,AUDIO,20240316,0,95000,APPLE_MUSIC,3,1,false,1700000001,"Artiste, Featuring - Titre - Remix"',
];
const CSV = [HEADER, ...ROWS].join("\n");

// Mêmes options que la page d'import
const parse = (csv: string) =>
  Papa.parse<AppleCSVRow>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });

describe("Export Apple Music – colonnes lues par la page d'import", () => {
  it("se lit sans erreur avec les options de la page d'import", () => {
    expect(parse(CSV).errors).toEqual([]);
  });

  it("contient une ligne par écoute agrégée", () => {
    expect(parse(CSV).data).toHaveLength(3);
  });

  it.each(REQUIRED_COLUMNS)("contient la colonne « %s »", (column) => {
    const { meta } = parse(CSV);
    expect(meta.fields).toContain(column);
  });

  it("renseigne chaque colonne utilisée pour toutes les lignes", () => {
    for (const row of parse(CSV).data) {
      for (const column of REQUIRED_COLUMNS) expect(row[column]).toBeDefined();
    }
  });

  it("lit les nombres sous forme de texte (à convertir avant calcul)", () => {
    const [row] = parse(CSV).data;
    expect(row["Play Duration Milliseconds"]).toBe("512000");
    expect(row["Play Count"]).toBe("2");
    expect(typeof row["Hours"]).toBe("string");
    expect(parseInt(row["Hours"])).toBe(9);
  });

  it("lit la date sous la forme AAAAMMJJ", () => {
    const rows = parse(CSV).data;
    expect(rows.map((r) => r["Date Played"])).toEqual(["20240315", "20240315", "20240316"]);
    for (const row of rows) expect(row["Date Played"]).toMatch(/^\d{8}$/);
  });

  it("lit la description sous la forme « Artiste - Titre »", () => {
    const [row] = parse(CSV).data;
    const [artist, ...song] = row["Track Description"].split(" - ");
    expect(artist).toBe("Laylow");
    expect(song.join(" - ")).toBe("Dehors dans la night");
  });

  it("conserve les virgules et les tirets d'une description entre guillemets", () => {
    const row = parse(CSV).data[2];
    expect(row["Track Description"]).toBe("Artiste, Featuring - Titre - Remix");
    expect(row["Play Count"]).toBe("3");
  });

  it("garde les colonnes inutilisées accessibles (signature d'index)", () => {
    const [row] = parse(CSV).data;
    expect(row["Country"]).toBe("FR");
    expect(row["Source Type"]).toBe("ITUNES_MATCH");
  });

  it("ignore les lignes vides (skipEmptyLines)", () => {
    const { data } = parse(`${CSV}\n\n\n`);
    expect(data).toHaveLength(3);
  });

  it("nettoie les espaces parasites des en-têtes (transformHeader)", () => {
    const padded = CSV.replace("Track Identifier", " Track Identifier ").replace("Hours", "Hours  ");
    const { meta } = parse(padded);
    expect(meta.fields).toContain("Track Identifier");
    expect(meta.fields).toContain("Hours");
  });

  it("tolère le BOM en début de fichier sur la première colonne", () => {
    const { meta } = parse(`﻿${CSV}`);
    expect(meta.fields?.[0]).toBe("Country");
  });

  it("gère les fins de ligne Windows (CRLF)", () => {
    const { data, errors } = parse([HEADER, ...ROWS].join("\r\n"));
    expect(errors).toEqual([]);
    expect(data).toHaveLength(3);
    expect(data[2]["Track Description"]).toBe("Artiste, Featuring - Titre - Remix");
  });

  it("ne produit aucune ligne pour un fichier ne contenant que l'en-tête", () => {
    expect(parse(HEADER).data).toEqual([]);
  });

  it("signale l'absence d'une colonne obligatoire", () => {
    const { meta } = parse(CSV.replace("Track Identifier", "Identifiant"));
    expect(meta.fields).not.toContain("Track Identifier");
    expect(meta.fields).toContain("Identifiant");
  });
});
