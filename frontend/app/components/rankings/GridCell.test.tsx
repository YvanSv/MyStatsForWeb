import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

const dict = languages.fr.rankingcell;
const fmt = (n: number) => n.toLocaleString(dict.locale).replace(/\s/g, " "); // même normalisation des espaces que Testing Library

const track: DataInfo = {
  type: "track", id: 1, title: "Titre A", artist: "Artiste A", album: "Album A",
  cover: "https://img/cover.jpg", play_count: 12345, total_minutes: 678.6, engagement: 42.5, rating: 1.5,
};
const album: DataInfo = {
  type: "album", id: 2, name: "Album B", artist: "Artiste B",
  cover: "https://img/album.jpg", play_count: 10, total_minutes: 20.2, engagement: 50, rating: 0.9,
};
const artist: DataInfo = {
  type: "artist", id: 3, name: "Artiste C", image_url: "https://img/artist.jpg",
  play_count: 3000, total_minutes: 4000, engagement: 10, rating: 0.5,
};

import GridCell from "./GridCell";

const renderCell = (element: DataInfo, index = 0, sort = "play_count") =>
  render(<GridCell element={element} index={index} sort={sort} />);

describe("GridCell – contenu par type", () => {
  it("affiche un titre : titre, artiste, album, image et rang", () => {
    const { container } = renderCell(track, 2);
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByAltText("Titre A")).toHaveAttribute("src", "https://img/cover.jpg");
    expect(screen.getByText("Album A")).toHaveClass("italic");
    expect(container.querySelector("p")).toHaveTextContent("Artiste A ● Album A");
  });

  it("affiche un album : nom, artiste, sans album ni séparateur", () => {
    const { container } = renderCell(album);
    expect(screen.getByRole("heading", { name: "Album B" })).toBeInTheDocument();
    expect(screen.getByAltText("Album B")).toHaveAttribute("src", "https://img/album.jpg");
    expect(container.querySelector("p")).toHaveTextContent(/^Artiste B$/);
  });

  it("affiche un artiste : nom, image_url, pas de sous-titre, étoile sur la note", () => {
    const { container } = renderCell(artist);
    expect(screen.getByRole("heading", { name: "Artiste C" })).toHaveClass("text-center");
    expect(screen.getByAltText("Artiste C")).toHaveAttribute("src", "https://img/artist.jpg");
    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByText("0,5 ★")).toBeInTheDocument();
  });

  it.each([
    ["un titre", track],
    ["un album", album],
    ["un artiste", artist],
  ])("affiche l'étoile sur la note de %s", (_label, element) => {
    renderCell(element);
    expect(screen.getByText(/★/)).toBeInTheDocument();
  });

  it("applique une forme ronde à l'image d'un artiste uniquement", () => {
    const { container, unmount } = renderCell(artist);
    expect(container.querySelector(".aspect-square")).toHaveClass("rounded-full");
    unmount();
    const { container: c2 } = renderCell(track);
    expect(c2.querySelector(".aspect-square")).not.toHaveClass("rounded-full");
  });
});

describe("GridCell – nom et image de repli", () => {
  it("préfère title à name", () => {
    renderCell({ ...track, name: "Autre" });
    expect(screen.getByRole("heading", { name: "Titre A" })).toBeInTheDocument();
  });

  it("utilise « Inconnu » quand ni titre ni nom n'existent", () => {
    renderCell({ ...track, title: undefined, name: undefined, cover: undefined });
    expect(screen.getByRole("heading", { name: dict.unknown })).toBeInTheDocument();
  });

  it("utilise « Inconnu » pour un titre vide", () => {
    renderCell({ ...track, title: "", name: "" });
    expect(screen.getByRole("heading", { name: "Inconnu" })).toBeInTheDocument();
  });

  it("affiche un « ? » sans image quand cover et image_url manquent", () => {
    renderCell({ ...track, cover: undefined, image_url: undefined });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("préfère cover à image_url", () => {
    renderCell({ ...track, image_url: "https://img/autre.jpg" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img/cover.jpg");
  });

  it("se rabat sur image_url sans cover", () => {
    renderCell({ ...album, cover: undefined, image_url: "https://img/autre.jpg" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://img/autre.jpg");
  });
});

const desktopFooter = (container: HTMLElement) => container.querySelector<HTMLElement>(".md\\:grid")!;
const mobileFooter = (container: HTMLElement) => container.querySelector<HTMLElement>(".md\\:hidden")!;

describe("GridCell – statistiques", () => {
  it("formate les statistiques du pied de page desktop avec la locale", () => {
    const { container } = renderCell(track);
    const footer = within(desktopFooter(container));
    expect(footer.getByText(fmt(12345))).toBeInTheDocument();
    expect(footer.getByText(fmt(679))).toBeInTheDocument(); // minutes arrondies
    expect(footer.getByText(fmt(42.5))).toBeInTheDocument();
    expect(footer.getByText(dict.unitStreams)).toBeInTheDocument();
    expect(footer.getByText(dict.unitMinutes)).toBeInTheDocument();
    expect(footer.getByText("%")).toBeInTheDocument();
  });

  it("formate le pied de page mobile comme le desktop (séparateur de milliers, minutes arrondies)", () => {
    const { container } = renderCell(track);
    const footer = within(mobileFooter(container));
    expect(footer.getByText(fmt(12345))).toBeInTheDocument();
    expect(footer.getByText(`${fmt(679)}m`)).toBeInTheDocument();
    expect(footer.getByText(`${fmt(42.5)}%`)).toBeInTheDocument();
  });

  it("sépare les milliers dans le pied de page mobile", () => {
    const { container } = renderCell({ ...track, play_count: 1234567, total_minutes: 98765 });
    expect(mobileFooter(container).textContent!.replace(/\s/g, " ")).toContain(fmt(1234567));
    expect(mobileFooter(container).textContent!.replace(/\s/g, " ")).toContain(`${fmt(98765)}m`);
  });

  it.each([[undefined], [null], [NaN]])("minutes %s : « - » sans unité sur desktop comme sur mobile", (minutes) => {
    const { container } = renderCell({ ...track, total_minutes: minutes as unknown as number });
    expect(within(desktopFooter(container)).queryByText(dict.unitMinutes)).not.toBeInTheDocument();
    expect(within(desktopFooter(container)).getByText("-")).toBeInTheDocument();
    expect(within(mobileFooter(container)).getByText("-")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/-m|NaN/);
  });

  it("n'affiche jamais « -% » : engagement absent = « - » sur desktop et mobile", () => {
    const { container } = renderCell({ ...track, engagement: undefined as unknown as number });
    expect(mobileFooter(container)).not.toHaveTextContent("%");
    expect(desktopFooter(container)).not.toHaveTextContent("%");
    expect(container.textContent).not.toContain("-%");
  });

  it("streams absents : « - » sans unité, partout", () => {
    const { container } = renderCell({ ...track, play_count: null as unknown as number });
    expect(within(desktopFooter(container)).queryByText(dict.unitStreams)).not.toBeInTheDocument();
    expect(within(mobileFooter(container)).getAllByText("-")).toHaveLength(1);
  });

  it("affiche 0 quand total_minutes, play_count ou engagement valent 0", () => {
    const { container } = renderCell({ ...track, total_minutes: 0, play_count: 0, engagement: 0 });
    expect(container.textContent).not.toContain("-");
    expect(within(mobileFooter(container)).getByText("0m")).toBeInTheDocument();
    expect(within(mobileFooter(container)).getByText("0%")).toBeInTheDocument();
    expect(within(mobileFooter(container)).getByText("0")).toBeInTheDocument();
  });
});

describe("GridCell – couleur de la note", () => {
  it.each([
    [1.35, "text2"],
    [2, "text2"],
    [1.34, "text-jaune"],
    [0.8, "text-jaune"],
    [0.79, "text-rouge"],
    [0, "text-rouge"],
  ])("note %s -> classe %s", (rating, cls) => {
    renderCell({ ...track, rating });
    expect(screen.getByText(`${rating.toLocaleString("fr-FR")} ★`)).toHaveClass(cls);
  });

  it("met la note en gras uniquement quand le tri courant est rating", () => {
    const { unmount } = renderCell(track, 0, "rating");
    expect(screen.getByText("1,5 ★")).toHaveClass("font-black");
    unmount();
    renderCell(track, 0, "play_count");
    expect(screen.getByText("1,5 ★")).toHaveClass("font-medium");
  });
});

describe("GridCell – mise en évidence du tri", () => {
  it.each([
    ["play_count", () => fmt(12345)],
    ["total_minutes", () => fmt(679)],
    ["engagement", () => fmt(42.5)],
  ])("tri %s : seule la statistique correspondante est en évidence", (sort, value) => {
    const { container } = renderCell(track, 0, sort);
    for (const v of [fmt(12345), fmt(679), fmt(42.5)]) {
      const el = within(desktopFooter(container)).getByText(v);
      expect(el).toHaveClass(v === value() ? "text2" : "text3");
    }
  });

  it("met en évidence la valeur mobile correspondant au tri", () => {
    const { container } = renderCell(track, 0, "engagement");
    const footer = within(mobileFooter(container));
    expect(footer.getByText(`${fmt(42.5)}%`)).toHaveClass("text2");
    expect(footer.getByText(fmt(12345))).toHaveClass("text3");
    expect(footer.getByText(`${fmt(679)}m`)).toHaveClass("text3");
  });

  it("aucune statistique en évidence pour un tri inconnu", () => {
    const { container } = renderCell(track, 0, "title");
    expect(within(desktopFooter(container)).getByText(fmt(12345))).toHaveClass("text3");
    expect(within(mobileFooter(container)).getByText(`${fmt(679)}m`)).toHaveClass("text3");
  });
});

describe("GridCell – rang", () => {
  it.each([[0, "#1"], [9, "#10"], [99, "#100"]])("index %s -> %s", (index, label) => {
    renderCell(track, index);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("GridCell – valeurs absentes", () => {
  const incomplete = { ...track, play_count: undefined, engagement: undefined, rating: undefined } as unknown as DataInfo;

  it("ne plante pas quand play_count, engagement ou rating sont absents", () => {
    expect(() => renderCell(incomplete)).not.toThrow();
  });

  it("affiche un tiret à la place des valeurs absentes", () => {
    renderCell(incomplete);
    // play_count, engagement et rating (« - ★ »)
    expect(screen.getAllByText(/^-( ★)?$/).length).toBeGreaterThanOrEqual(3);
  });

  it("ne produit aucun NaN ni « undefined » dans l'affichage", () => {
    const { container } = renderCell(incomplete);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("n'affiche pas de séparateur « ● » quand l'album d'un titre est absent", () => {
    const { container } = renderCell({ ...track, album: undefined });
    expect(container.textContent).not.toContain("●");
  });

  it("affiche le séparateur « ● » quand l'album d'un titre est présent", () => {
    const { container } = renderCell(track);
    expect(container.textContent).toContain("●");
  });
});
