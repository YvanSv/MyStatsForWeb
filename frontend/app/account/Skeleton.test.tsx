import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton (account)", () => {
  it("s'affiche sans erreur", () => {
    expect(() => render(<Skeleton />)).not.toThrow();
  });

  it("affiche uniquement des blocs animés, sans champ de saisie ni bouton", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("input, button")).toHaveLength(0);
  });

  it("reprend la structure de la page : 2 champs + 1 bouton à gauche, une carte de service à droite", () => {
    const { container } = render(<Skeleton />);
    // 2 champs (h-12) et le bouton d'enregistrement (h-14) de la colonne de gauche
    expect(container.querySelectorAll(".h-12")).toHaveLength(2);
    expect(container.querySelectorAll(".h-14")).toHaveLength(1);
    // Carte Spotify de la colonne de droite
    expect(container.querySelectorAll(".h-48")).toHaveLength(1);
  });
});
