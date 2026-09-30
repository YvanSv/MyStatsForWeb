import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LoadingSpinner, PulseSpinner } from "./CustomSpinner";

describe("LoadingSpinner", () => {
  it("utilise la taille md par défaut", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin")!;
    expect(spinner).toHaveClass("w-10", "h-10", "border-3");
  });

  it.each([
    ["sm", ["w-5", "h-5", "border-2"]],
    ["md", ["w-10", "h-10", "border-3"]],
    ["lg", ["w-16", "h-16", "border-4"]],
  ] as const)("applique les classes de la taille %s", (size, classes) => {
    const { container } = render(<LoadingSpinner size={size} />);
    expect(container.querySelector(".animate-spin")).toHaveClass(...classes);
  });

  it("ajoute className au conteneur", () => {
    const { container } = render(<LoadingSpinner className="my-8" />);
    expect(container.firstElementChild).toHaveClass("my-8", "justify-center");
  });
});

describe("PulseSpinner", () => {
  it("affiche trois points animés", () => {
    const { container } = render(<PulseSpinner />);
    expect(container.querySelectorAll(".animate-bounce")).toHaveLength(3);
  });
});
