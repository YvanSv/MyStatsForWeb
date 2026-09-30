import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SkeletonRanking from "./SkeletonRanking";

/** Conteneur des 20 éléments factices (celui qui a 20 enfants). */
const itemsContainer = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("div")).find((d) => d.children.length === 20)!;

describe("SkeletonRanking", () => {
  it("affiche 20 éléments factices quel que soit le mode", () => {
    for (const mode of [undefined, "grid", "grid_sm", "list"] as const) {
      const { container, unmount } = render(<SkeletonRanking viewMode={mode} />);
      expect(itemsContainer(container).children).toHaveLength(20);
      unmount();
    }
  });

  it("utilise la grille standard par défaut", () => {
    const { container } = render(<SkeletonRanking />);
    expect(itemsContainer(container)).toHaveClass("grid", "grid-cols-2", "lg:grid-cols-5");
  });

  it("utilise la grille standard en mode grid", () => {
    const { container } = render(<SkeletonRanking viewMode="grid" />);
    expect(itemsContainer(container)).toHaveClass("grid-cols-2", "gap-6");
  });

  it("utilise la petite grille en mode grid_sm", () => {
    const { container } = render(<SkeletonRanking viewMode="grid_sm" />);
    expect(itemsContainer(container)).toHaveClass("grid", "grid-cols-3", "lg:grid-cols-8");
  });

  it("utilise une pile verticale en mode list, avec des badges à droite", () => {
    const { container } = render(<SkeletonRanking viewMode="list" />);
    const items = itemsContainer(container);
    expect(items).toHaveClass("space-y-3");
    expect(items).not.toHaveClass("grid");
    expect(items.children[0]).toHaveClass("h-20");
    // image + textes + badges de droite
    expect(items.children[0].children).toHaveLength(3);
  });

  it("n'affiche pas les badges de droite en mode grille", () => {
    const { container } = render(<SkeletonRanking viewMode="grid" />);
    expect(itemsContainer(container).children[0].children).toHaveLength(2);
  });

  it("contient la barre latérale, les contrôles et le bouton « charger plus » factices, sans texte", () => {
    const { container } = render(<SkeletonRanking />);
    expect(container.querySelector("section")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:block.w-72")).toBeInTheDocument();
    expect(container.querySelector(".h-14.w-40")).toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });

  it("anime tous les blocs factices", () => {
    const { container } = render(<SkeletonRanking />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(20);
  });
});
