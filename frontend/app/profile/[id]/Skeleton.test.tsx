import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ProfileSkeleton } from "./Skeleton";

describe("ProfileSkeleton", () => {
  it("se rend sans contenu textuel", () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.textContent).toBe("");
  });

  it("n'expose aucun élément interactif", () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelectorAll("button, a, input, img")).toHaveLength(0);
  });

  it("affiche 5 cartes de stats, 2 sections de 6 éléments et 5 lignes d'écoutes", () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelectorAll(".h-32.rounded-3xl")).toHaveLength(5);
    expect(container.querySelectorAll(".flex-shrink-0")).toHaveLength(12);
    expect(container.querySelectorAll(".h-12.w-12")).toHaveLength(5);
  });

  it("utilise l'animation de pulsation pour indiquer le chargement", () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });

  it("est stable entre deux rendus", () => {
    const a = render(<ProfileSkeleton />).container.innerHTML;
    const b = render(<ProfileSkeleton />).container.innerHTML;
    expect(a).toBe(b);
  });
});
