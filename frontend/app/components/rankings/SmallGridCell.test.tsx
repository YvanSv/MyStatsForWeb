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

import SmallGridCell from "./SmallGridCell";

const renderCell = (element: DataInfo, index = 0, sort = "play_count") =>
  render(<SmallGridCell element={element} index={index} sort={sort} />);

describe("SmallGridCell – contenu par type", () => {
  it("affiche un titre : titre, artiste ● album, image et rang", () => {
    const { container } = renderCell(track, 6);
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByAltText("Titre A")).toHaveAttribute("src", "https://img/cover.jpg");
    expect(container.querySelector("p")).toHaveTextContent("Artiste A ● Album A");
    expect(screen.getByText("Album A")).toHaveClass("italic");
  });

  it("affiche un album : l'artiste seul en sous-titre", () => {
    const { container } = renderCell(album);
    expect(screen.getByRole("heading", { name: "Album B" })).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent(/^Artiste B$/);
  });

  it("affiche un artiste : nom centré, image_url, pas de sous-titre, note avec étoile", () => {
    const { container } = renderCell(artist);
    expect(screen.getByRole("heading", { name: "Artiste C" })).toHaveClass("text-center");
    expect(screen.getByAltText("Artiste C")).toHaveAttribute("src", "https://img/artist.jpg");
    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByText("0,5 ★")).toBeInTheDocument();
  });

  it("n'affiche pas d'étoile pour un titre ou un album", () => {
    renderCell(album);
    expect(screen.getByText("0,9")).toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("image ronde pour un artiste uniquement", () => {
    const { container, unmount } = renderCell(artist);
    expect(container.querySelector(".aspect-square")).toHaveClass("rounded-full");
    unmount();
    const { container: c2 } = renderCell(album);
    expect(c2.querySelector(".aspect-square")).not.toHaveClass("rounded-full");
  });
});

describe("SmallGridCell – nom et image de repli", () => {
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

describe("SmallGridCell – statistiques", () => {
  it("formate streams, minutes arrondies et engagement avec la locale", () => {
    renderCell(track);
    expect(screen.getByText(fmt(12345))).toBeInTheDocument();
    expect(screen.getByText(fmt(679))).toBeInTheDocument();
    expect(screen.getByText(fmt(42.5))).toBeInTheDocument();
    expect(screen.getByText(dict.unitStreams)).toBeInTheDocument();
    expect(screen.getByText(dict.unitMinutes)).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("affiche « - » quand les minutes sont absentes", () => {
    renderCell({ ...track, total_minutes: undefined as unknown as number });
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText(dict.unitMinutes)).not.toBeInTheDocument();
  });

  it("affiche 0 (et non « - ») quand total_minutes vaut 0", () => {
    renderCell({ ...track, total_minutes: 0 });
    expect(screen.queryByText("-")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("sépare les milliers selon la locale française", () => {
    renderCell({ ...track, play_count: 1234567 });
    expect(screen.getByText(fmt(1234567))).toBeInTheDocument();
  });
});

describe("SmallGridCell – couleur de la note", () => {
  it.each([
    [1.35, "text2"],
    [1.34, "text-jaune"],
    [0.8, "text-jaune"],
    [0.79, "text-rouge"],
    [0, "text-rouge"],
  ])("note %s -> classe %s", (rating, cls) => {
    renderCell({ ...track, rating });
    expect(screen.getByText(rating.toLocaleString("fr-FR"))).toHaveClass(cls);
  });

  it("met la note en gras uniquement quand le tri est rating", () => {
    const { unmount } = renderCell(track, 0, "rating");
    expect(screen.getByText("1,5")).toHaveClass("font-bold");
    unmount();
    renderCell(track, 0, "play_count");
    expect(screen.getByText("1,5")).toHaveClass("font-medium");
  });
});

describe("SmallGridCell – mise en évidence du tri", () => {
  it.each([
    ["play_count", () => fmt(12345)],
    ["total_minutes", () => fmt(679)],
    ["engagement", () => fmt(42.5)],
  ])("tri %s : seule la statistique correspondante est en évidence", (sort, value) => {
    renderCell(track, 0, sort);
    for (const v of [fmt(12345), fmt(679), fmt(42.5)]) {
      expect(screen.getByText(v)).toHaveClass(v === value() ? "text2" : "text3");
    }
  });

  it("aucune statistique en évidence pour un tri inconnu", () => {
    renderCell(track, 0, "name");
    for (const v of [fmt(12345), fmt(679), fmt(42.5)]) expect(screen.getByText(v)).toHaveClass("text3");
  });
});

describe("SmallGridCell – rang", () => {
  it.each([[0, "#1"], [99, "#100"]])("index %s -> %s", (index, label) => {
    renderCell(track, index);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
