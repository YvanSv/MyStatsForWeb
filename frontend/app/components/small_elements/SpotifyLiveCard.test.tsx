import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { languages } from "../../constants/locales/lang";
import SpotifyLiveCard from "./SpotifyLiveCard";


vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const data = {
  title: "Titre Song",
  progress_ms: 0,
  duration_ms: 200000,
  album_name: "Album X",
  artist_name: "Artiste Y",
  cover_url: "https://img/cover.jpg",
};

type Size = "xs" | "md" | "lg";
const renderCard = (over: Partial<{ data: typeof data | null; currentProgress: number; size: Size }> = {}) =>
  render(
    <SpotifyLiveCard isListening data={"data" in over ? over.data! : data}
      currentProgress={over.currentProgress ?? 0} size={over.size ?? "md"} />
  );

describe("SpotifyLiveCard – sans lecture", () => {
  it("affiche le message d'inactivité", () => {
    renderCard({ data: null });
    expect(screen.getByText(languages.fr.api.currentListeningOff)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each([["xs", "p-3"], ["md", "p-5"], ["lg", "p-8"]] as const)("adapte le conteneur à la taille %s", (size, cls) => {
    const { container } = renderCard({ data: null, size });
    expect(container.firstElementChild).toHaveClass(cls);
  });
});

describe("SpotifyLiveCard – lecture en cours", () => {
  it("affiche titre, artiste, pochette et album", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: data.title })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(data.artist_name))).toBeInTheDocument();
    expect(screen.getByText(/Album X/)).toBeInTheDocument();
    const img = screen.getByRole("img", { name: data.album_name });
    expect(img).toHaveAttribute("src", data.cover_url);
  });

  it("n'affiche pas le message d'inactivité", () => {
    renderCard();
    expect(screen.queryByText(languages.fr.api.currentListeningOff)).not.toBeInTheDocument();
  });

  it("cache le nom de l'album en taille xs", () => {
    renderCard({ size: "xs" });
    expect(screen.queryByText(/•/)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(data.artist_name))).toBeInTheDocument();
  });

  it.each(["md", "lg"] as const)("affiche le nom de l'album en taille %s", (size) => {
    renderCard({ size });
    expect(screen.getByText(/• Album X/)).toBeInTheDocument();
  });

  it("affiche la progression et la durée formatées", () => {
    renderCard({ currentProgress: 65000 });
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText("3:20")).toBeInTheDocument();
  });

  it.each([
    [0, "0:00"],
    [9000, "0:09"],
    [59000, "0:59"],
    [59600, "1:00"],
    [59499, "0:59"],
    [119600, "2:00"],
    [600000, "10:00"],
  ])("formate %i ms en %s", (ms, label) => {
    renderCard({ currentProgress: ms });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("calcule la largeur de la barre de progression en pourcentage", () => {
    const { container } = renderCard({ currentProgress: 50000 });
    const bar = container.querySelector(".bg-green-500.rounded-full.transition-all") as HTMLElement;
    expect(bar.style.width).toBe("25%");
  });

  it("n'affiche jamais « 0:60 » (arrondi de la seconde au-dessus)", () => {
    renderCard({ currentProgress: 59600 });
    expect(screen.queryByText("0:60")).not.toBeInTheDocument();
  });

  it("garde une barre à 0% quand la durée est inconnue (0), sans NaN ni Infinity", () => {
    const { container } = renderCard({ data: { ...data, duration_ms: 0 }, currentProgress: 5000 });
    const bar = container.querySelector(".transition-all.duration-1000") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("ne dépasse jamais 100% même si la progression locale dépasse la durée", () => {
    const { container } = renderCard({ currentProgress: 250000 });
    const bar = container.querySelector(".transition-all.duration-1000") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("ne passe jamais sous 0% avec une progression négative", () => {
    const { container } = renderCard({ currentProgress: -500 });
    const bar = container.querySelector(".transition-all.duration-1000") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("barre vide à 0 et pleine à la fin", () => {
    const { container, rerender } = renderCard({ currentProgress: 0 });
    const width = () => (container.querySelector(".transition-all.duration-1000") as HTMLElement).style.width;
    expect(width()).toBe("0%");
    rerender(<SpotifyLiveCard isListening data={data} currentProgress={200000} size="md" />);
    expect(width()).toBe("100%");
  });

  it("affiche trois barres d'égaliseur", () => {
    const { container } = renderCard();
    expect(container.querySelectorAll(".w-1.animate-bounce")).toHaveLength(3);
  });

  it.each([
    ["xs", "min-w-[200px]", "h-1"],
    ["md", "min-w-[350px]", "h-1.5"],
    ["lg", "min-w-[450px]", "h-1.5"],
  ] as const)("applique les styles de la taille %s", (size, minWidth, barHeight) => {
    const { container } = renderCard({ size });
    expect(container.firstElementChild).toHaveClass(minWidth);
    expect(container.querySelector(".bg-white\\/10.rounded-full")).toHaveClass(barHeight);
  });

  it("utilise un halo plus grand en taille lg", () => {
    const { container, rerender } = renderCard({ size: "lg" });
    expect(container.querySelector(".blur-\\[80px\\]")).toHaveClass("w-64", "h-64");
    rerender(<SpotifyLiveCard isListening data={data} currentProgress={0} size="md" />);
    expect(container.querySelector(".blur-\\[80px\\]")).toHaveClass("w-40", "h-40");
  });
});
