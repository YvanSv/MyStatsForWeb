import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ProfileEditSkeleton } from "./Skeleton";

describe("ProfileEditSkeleton", () => {
  it("rend un élément main de page complète", () => {
    const { container } = render(<ProfileEditSkeleton />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("min-h-screen");
  });

  it("n'affiche aucun texte, bouton ni champ de formulaire", () => {
    const { container } = render(<ProfileEditSkeleton />);
    expect(container.textContent?.trim()).toBe("");
    expect(container.querySelector("button, input, textarea, a")).toBeNull();
  });

  it("contient de nombreux blocs animés (pulse)", () => {
    const { container } = render(<ProfileEditSkeleton />);
    // bannière + avatar + 2 titres + nom (2) + bio (3) + permissions (1 + 5*3) + footer (2)
    expect(container.querySelectorAll(".animate-pulse").length).toBe(27);
  });

  it("affiche exactement cinq lignes de permissions (un switch arrondi par ligne)", () => {
    const { container } = render(<ProfileEditSkeleton />);
    expect(container.querySelectorAll(".rounded-full.h-6.w-12")).toHaveLength(5);
  });

  it("est stable : deux rendus donnent le même HTML", () => {
    const a = render(<ProfileEditSkeleton />).container.innerHTML;
    const b = render(<ProfileEditSkeleton />).container.innerHTML;
    expect(a).toBe(b);
  });
});
