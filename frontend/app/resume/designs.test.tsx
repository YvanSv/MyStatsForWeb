/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { DesignCard } from "./designs";

const t = languages.fr;
const dict = t.resume;

const item = (name: string, over: Record<string, any> = {}) => ({
  name, streams: 1500, minutes: 2500, rating: 4.567, image: `${name}.png`, ...over,
});
const list = (prefix: string, n = 5) => Array.from({ length: n }, (_, i) => item(`${prefix}${i + 1}`));

const data = (over: Record<string, any> = {}) => ({
  topArtists: list("Artiste"), topTracks: list("Titre"), topAlbums: list("Album"),
  minutes: 123456, streams: 7890, ...over,
});

const setup = (over: Record<string, any> = {}, sort: any = "streams", range: string | number = "year", tt: any = t) =>
  render(<DesignCard resumeData={data(over)} t={tt} sort={sort} range={range} />);

describe("DesignCard – rendu", () => {
  it("affiche le n°1 de chaque classement en titre de niveau 2", () => {
    setup();
    const titles = screen.getAllByRole("heading", { level: 2 }).map((e) => e.textContent);
    expect(titles).toEqual(["Artiste1", "Titre1", "Album1"]);
  });

  it("n'affiche pas les rangs 2 à 5 (liste désactivée)", () => {
    setup();
    expect(screen.queryByText("Artiste2")).not.toBeInTheDocument();
  });

  it("affiche l'image du n°1 avec son nom en texte alternatif", () => {
    setup();
    const img = screen.getByAltText("Titre1");
    expect(img).toHaveAttribute("src", "Titre1.png");
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("affiche les minutes totales formatées et l'unité", () => {
    setup();
    expect(screen.getByText(dict.totalTime)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${(123456).toLocaleString().replace(/\s/g, "\\s")}`))).toBeInTheDocument();
    expect(screen.getByText("MIN")).toBeInTheDocument();
  });

  it("affiche les streams totaux formatés et l'unité", () => {
    setup();
    expect(screen.getByText(dict.totalStreams)).toBeInTheDocument();
    expect(screen.getByText("STREAMS")).toBeInTheDocument();
  });

  it("affiche le branding et la période", () => {
    setup({}, "streams", "month");
    expect(screen.getByText("month")).toBeInTheDocument();
    expect(screen.getByText("Generated with MyStats")).toBeInTheDocument();
  });

  it("accepte une période numérique (année)", () => {
    setup({}, "streams", 2025);
    expect(screen.getByText("2025")).toBeInTheDocument();
  });

  it("utilise les libellés de repli quand le dictionnaire est vide", () => {
    setup({}, "streams", "year", { resume: {} });
    expect(screen.getByText("Temps d'écoute")).toBeInTheDocument();
    expect(screen.getByText("Nombre de streams")).toBeInTheDocument();
    expect(screen.getByText("Artiste n°1")).toBeInTheDocument();
    expect(screen.getByText("Titre n°1")).toBeInTheDocument();
    expect(screen.getByText("Album n°1")).toBeInTheDocument();
  });

  it("formate 0 minute / 0 stream", () => {
    setup({ minutes: 0, streams: 0 });
    expect(screen.getByText("MIN").parentElement).toHaveTextContent(/^0\s+MIN$/);
    expect(screen.getByText("STREAMS").parentElement).toHaveTextContent(/^0\s+STREAMS$/);
  });
});

describe("DesignCard – tri", () => {
  it("sort=streams : affiche les streams du n°1", () => {
    setup({}, "streams");
    expect(screen.getAllByText(/Avec/)[0]).toHaveTextContent(`Avec ${(1500).toLocaleString()} streams`);
  });

  it("sort=minutes : affiche les minutes du n°1", () => {
    setup({}, "minutes");
    expect(screen.getAllByText(/Avec/)[0]).toHaveTextContent(`Avec ${(2500).toLocaleString()} minutes`);
  });

  it("sort=rating : affiche la note arrondie à 2 décimales avec une étoile", () => {
    setup({}, "rating");
    const el = screen.getAllByText(/Avec/)[0];
    expect(el).toHaveTextContent(/Avec 4[.,]57★$/);
  });

  it("applique le tri aux trois classements", () => {
    setup({}, "minutes");
    expect(screen.getAllByText(/Avec/)).toHaveLength(3);
  });

  it("rating 0 reste affiché (0★)", () => {
    setup({ topArtists: [item("Z", { rating: 0 })] }, "rating");
    expect(screen.getAllByText(/Avec/)[0]).toHaveTextContent("Avec 0★");
  });

  it("n°1 avec un seul élément par classement fonctionne", () => {
    setup({ topArtists: list("A", 1), topTracks: list("T", 1), topAlbums: list("B", 1) });
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });
});

describe("DesignCard – défauts attendus", () => {
  it("ne plante pas avec des classements vides (données absentes)", () => {
    expect(() => setup({ topArtists: [], topTracks: [], topAlbums: [] })).not.toThrow();
  });

  it("les libellés des classements pistes et albums sont adaptés (Titre n°1 / Album n°1)", () => {
    setup();
    expect(screen.getAllByText(dict.topTrack)).toHaveLength(1);
    expect(screen.getAllByText(dict.topArtist)).toHaveLength(1);
    expect(screen.getAllByText(dict.topAlbum)).toHaveLength(1);
  });

  it("ne rend pas d'img sans attribut src quand le n°1 n'a pas d'image", () => {
    setup({ topArtists: [item("Sans image", { image: undefined })] });
    const img = screen.getByAltText("Sans image");
    expect(img).toHaveAttribute("src");
  });
});
