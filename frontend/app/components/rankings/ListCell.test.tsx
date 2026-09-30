import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { languages } from "../../constants/locales/lang";
import type { DataInfo } from "@/app/data/DataInfos";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ fill, alt, ...props }: any) => <img alt={alt} data-fill={fill ? "true" : undefined} {...props} />, // eslint-disable-line @next/next/no-img-element
}));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const dict = languages.fr.smallgridcell;
const fmt = (n: number) => n.toLocaleString(dict.locale).replace(/\s/g, " "); // même normalisation des espaces que Testing Library

const track: DataInfo = {
  type: "track", spotify_id: "t1", title: "Titre A", artist: "Artiste A", album: "Album A",
  cover: "https://img/cover.jpg", play_count: 12345, total_minutes: 678.6, engagement: 42.5, rating: 1.5,
};
const album: DataInfo = {
  type: "album", spotify_id: "a1", name: "Album B", artist: "Artiste B",
  cover: "https://img/album.jpg", play_count: 10, total_minutes: 20.2, engagement: 50, rating: 0.9,
};
const artist: DataInfo = {
  type: "artist", id: "ar1", name: "Artiste C", image_url: "https://img/artist.jpg",
  play_count: 3000, total_minutes: 4000, engagement: 10, rating: 0.5,
};

import ListCell from "./ListCell";

const renderCell = (element: DataInfo, index = 0, sort = "play_count") =>
  render(<ListCell element={element} index={index} sort={sort} />);

describe("ListCell – contenu par type", () => {
  it("affiche un titre : titre, artiste ● album, image et rang", () => {
    const { container } = renderCell(track, 4);
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByAltText("Titre A")).toHaveAttribute("src", "https://img/cover.jpg");
    expect(container.querySelector("p")).toHaveTextContent("Artiste A ● Album A");
    expect(screen.getByText("Album A")).toHaveClass("italic");
  });

  it("affiche un album : seulement l'artiste en sous-titre", () => {
    const { container } = renderCell(album);
    expect(screen.getByRole("heading", { name: "Album B" })).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent(/^Artiste B$/);
  });

  it("affiche un artiste : pas de sous-titre, image ronde", () => {
    const { container } = renderCell(artist);
    expect(screen.getByRole("heading", { name: "Artiste C" })).toBeInTheDocument();
    expect(screen.getByAltText("Artiste C")).toHaveAttribute("src", "https://img/artist.jpg");
    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByAltText("Artiste C").parentElement).toHaveClass("rounded-full");
  });

  it("n'arrondit pas complètement l'image d'un titre", () => {
    renderCell(track);
    expect(screen.getByAltText("Titre A").parentElement).toHaveClass("rounded-lg");
  });
});

describe("ListCell – nom et image de repli", () => {
  it("préfère title à name", () => {
    renderCell({ ...track, name: "Autre" });
    expect(screen.getByRole("heading", { name: "Titre A" })).toBeInTheDocument();
  });

  it("utilise « Inconnu » sans titre ni nom", () => {
    renderCell({ ...track, title: undefined, name: undefined });
    expect(screen.getByRole("heading", { name: dict.unknown })).toBeInTheDocument();
  });

  it("affiche « ? » sans image", () => {
    renderCell({ ...track, cover: undefined, image_url: undefined });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("se rabat sur image_url sans cover", () => {
    renderCell({ ...album, cover: undefined, image_url: "https://img/autre.jpg" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img/autre.jpg");
  });
});

describe("ListCell – colonnes desktop", () => {
  it("formate streams, minutes arrondies, engagement et note avec la locale", () => {
    const { container } = renderCell(track);
    const text = container.textContent!.replace(/\s/g, " ");
    expect(text).toContain(`${fmt(12345)} ${dict.unitStreams}`);
    expect(text).toContain(`${fmt(679)} ${dict.unitMinutes}`);
    expect(screen.getByText(`${fmt(42.5)}%`)).toBeInTheDocument();
    expect(screen.getByText("1,5★")).toBeInTheDocument();
  });

  it("affiche 0 minute quand total_minutes est absent", () => {
    const { container } = renderCell({ ...track, total_minutes: undefined as unknown as number });
    expect(container.textContent).toContain(`0 ${dict.unitMinutes}`);
  });

  it.each([[0], [42.5], [100]])("la barre d'engagement fait %s%% de large", (engagement) => {
    const { container } = renderCell({ ...track, engagement });
    const fill = container.querySelector<HTMLElement>(".h-1 > div")!;
    expect(fill.style.width).toBe(`${engagement}%`);
  });

  it("colore la barre d'engagement selon le tri", () => {
    const { container, unmount } = renderCell(track, 0, "engagement");
    expect(container.querySelector(".h-1 > div")).toHaveClass("bg-vert");
    unmount();
    const { container: c2 } = renderCell(track, 0, "play_count");
    expect(c2.querySelector(".h-1 > div")).toHaveClass("bg-gray-400");
  });
});

describe("ListCell – statistique mobile", () => {
  const mobile = (container: HTMLElement) => container.querySelector(".lg\\:hidden")!;

  it("tri play_count : nombre brut + unité STR", () => {
    const { container } = renderCell(track, 0, "play_count");
    expect(mobile(container)).toHaveTextContent("12345STR");
  });

  it("tri engagement : pourcentage sans unité", () => {
    const { container } = renderCell(track, 0, "engagement");
    expect(mobile(container)).toHaveTextContent(/^42\.5%$/);
  });

  it("tri total_minutes : minutes arrondies + unité MIN", () => {
    const { container } = renderCell(track, 0, "total_minutes");
    expect(mobile(container)).toHaveTextContent("679MIN");
  });

  it("tri inconnu (ex. title) : se rabat sur les minutes", () => {
    const { container } = renderCell(track, 0, "title");
    expect(mobile(container)).toHaveTextContent("679MIN");
  });

  it("tri rating : pas de statistique mobile (espace réservé)", () => {
    const { container } = renderCell(track, 0, "rating");
    expect(mobile(container).children).toHaveLength(1);
    expect(mobile(container).firstElementChild).toHaveClass("h-5");
    expect(mobile(container)).not.toHaveTextContent("STR");
  });

  it("minutes absentes : affiche 0 MIN", () => {
    const { container } = renderCell({ ...track, total_minutes: undefined as unknown as number }, 0, "total_minutes");
    expect(mobile(container)).toHaveTextContent("0MIN");
  });
});

describe("ListCell – couleur de la note", () => {
  it.each([
    [1.35, "text2"],
    [1.34, "text-jaune"],
    [0.8, "text-jaune"],
    [0.79, "text-rouge"],
    [0, "text-rouge"],
  ])("note %s -> classe %s", (rating, cls) => {
    renderCell({ ...track, rating });
    expect(screen.getByText(`${rating.toLocaleString("fr-FR")}★`)).toHaveClass(cls);
  });

  it("met la note en gras uniquement quand le tri est rating", () => {
    const { unmount } = renderCell(track, 0, "rating");
    expect(screen.getByText("1,5★")).toHaveClass("font-bold");
    unmount();
    renderCell(track, 0, "play_count");
    expect(screen.getByText("1,5★")).toHaveClass("text-sm");
    expect(screen.getByText("1,5★")).not.toHaveClass("font-bold");
  });
});

describe("ListCell – mise en évidence des colonnes", () => {
  const cols = (container: HTMLElement) => Array.from(container.querySelectorAll(".hidden.lg\\:block"));

  it.each([
    ["play_count", 0],
    ["total_minutes", 1],
  ])("tri %s : seule la colonne correspondante est active", (sort, active) => {
    const { container } = renderCell(track, 0, sort);
    cols(container).forEach((c, i) => {
      if (i === active) expect(c).toHaveClass("text2", "font-bold");
      else expect(c).toHaveClass("text3");
    });
  });

  it("tri engagement : le pourcentage est en évidence", () => {
    renderCell(track, 0, "engagement");
    expect(screen.getByText(`${fmt(42.5)}%`)).toHaveClass("text2", "font-bold");
  });

  it("tri autre : le pourcentage est atténué", () => {
    renderCell(track, 0, "play_count");
    expect(screen.getByText(`${fmt(42.5)}%`)).toHaveClass("text3");
  });
});

describe("ListCell – rang", () => {
  it.each([[0, "#1"], [49, "#50"]])("index %s -> %s", (index, label) => {
    renderCell(track, index);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
