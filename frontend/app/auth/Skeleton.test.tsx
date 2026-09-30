import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonAuth } from "./Skeleton";

describe("SkeletonAuth", () => {
  it("s'affiche sans erreur", () => {
    expect(() => render(<SkeletonAuth />)).not.toThrow();
  });

  it("affiche uniquement des blocs animés, sans champ de saisie ni bouton", () => {
    const { container } = render(<SkeletonAuth />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("input, button, form")).toHaveLength(0);
  });

  it("reprend les 6 champs de saisie des deux formulaires (2 connexion, 4 inscription)", () => {
    const { container } = render(<SkeletonAuth />);
    expect(container.querySelectorAll(".h-12")).toHaveLength(6);
  });

  it("reprend les 3 gros boutons (Spotify, connexion, création de compte)", () => {
    const { container } = render(<SkeletonAuth />);
    expect(container.querySelectorAll(".h-14")).toHaveLength(3);
  });

  it("affiche le bouton Spotify arrondi et teinté de vert", () => {
    const { container } = render(<SkeletonAuth />);
    expect(container.querySelectorAll(".rounded-full.bg-vert\\/10")).toHaveLength(1);
  });
});
