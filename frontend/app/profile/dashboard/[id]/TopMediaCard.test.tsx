import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { languages } from "@/app/constants/locales/lang";
import TopMediaCard from "./TopMediaCard";

const dict = languages.fr.dashboard;

vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("@/app/components/small_elements/CustomSpinner", () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}));

const byMinutes = { name: "Titre Minutes", artist: "Artiste M", album: "Album M", image: "/m.png" };
const byStreams = { name: "Titre Streams", artist: "Artiste S", album: "Album S", image: "/s.png" };
const item = [byMinutes, byStreams];

const renderCard = (props: Partial<React.ComponentProps<typeof TopMediaCard>> = {}) =>
  render(<TopMediaCard label="Top Titre" item={item} loading={false} type="track" metric="minutes" {...props} />);

describe("TopMediaCard", () => {
  it("affiche le libellé", () => {
    renderCard();
    expect(screen.getByText("Top Titre")).toBeInTheDocument();
  });

  it("métrique minutes : affiche le premier élément (titre, artiste, album, image)", () => {
    renderCard({ metric: "minutes" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Titre Minutes");
    expect(screen.getByText("Artiste M")).toBeInTheDocument();
    expect(screen.getByText("Album M")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/m.png");
  });

  it("métrique streams : affiche le second élément (titre, artiste, album, image)", () => {
    renderCard({ metric: "streams" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Titre Streams");
    expect(screen.getByText("Artiste S")).toBeInTheDocument();
    expect(screen.getByText("Album S")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/s.png");
  });

  it("l'image a pour texte alternatif le libellé", () => {
    renderCard();
    expect(screen.getByRole("img", { name: "Top Titre" })).toBeInTheDocument();
  });

  it("n'affiche pas l'album pour un album ou un artiste", () => {
    renderCard({ type: "album" });
    expect(screen.queryByText("Album M")).toBeNull();
  });

  it("n'affiche pas l'album pour un artiste", () => {
    renderCard({ type: "artist" });
    expect(screen.queryByText("Album M")).toBeNull();
  });

  it("en chargement : spinner à la place de l'image et points de suspension", () => {
    renderCard({ loading: true });
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("...");
    expect(screen.queryByText("Titre Minutes")).toBeNull();
    expect(screen.queryByText("Album M")).toBeNull();
  });

  it("en chargement avec item null : ne plante pas", () => {
    expect(() => renderCard({ loading: true, item: null, metric: "streams" })).not.toThrow();
  });

  it("streams, valeur absente (null) : affiche 'Aucun' sans planter", () => {
    expect(() => renderCard({ item: null, metric: "streams" })).not.toThrow();
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(dict.none);
  });

  it("streams, valeur absente, album/artiste : ne plante pas pour un titre", () => {
    expect(() => renderCard({ item: null, metric: "streams", type: "track" })).not.toThrow();
  });

  it("streams, tableau vide : affiche 'Aucun' et l'image par défaut", () => {
    renderCard({ item: [], metric: "streams" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(dict.none);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/default-cover.png");
  });

  it("streams, second élément absent : affiche 'Aucun'", () => {
    renderCard({ item: [byMinutes], metric: "streams" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(dict.none);
  });

  it("streams, image absente : utilise l'image par défaut", () => {
    renderCard({ item: [byMinutes, { ...byStreams, image: null }], metric: "streams" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/default-cover.png");
  });

  it("minutes, valeur absente (null) : affiche 'Aucun'", () => {
    renderCard({ item: null, metric: "minutes", type: "artist" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(dict.none);
  });

  it("minutes, tableau vide : affiche 'Aucun'", () => {
    renderCard({ item: [], metric: "minutes", type: "album" });
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(dict.none);
  });

  it("minutes, image absente : utilise l'image par défaut", () => {
    renderCard({ item: [{ ...byMinutes, image: null }, byStreams], metric: "minutes" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/default-cover.png");
  });

  it("minutes, aucune donnée : utilise l'image par défaut", () => {
    renderCard({ item: null, metric: "minutes", type: "artist" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/default-cover.png");
  });

  it("artiste manquant : n'affiche pas 'undefined'", () => {
    const { container } = renderCard({ item: [{ name: "X", image: "/x.png" }, byStreams], type: "album" });
    expect(container.textContent).not.toContain("undefined");
  });
});
