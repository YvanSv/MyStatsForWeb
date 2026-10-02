import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CharCounter, counterColorClass } from "./CharCounter";

const NAME = { min: 3, warn: 14, danger: 17, max: 20 };

describe("counterColorClass", () => {
  it.each([
    [0, "text-rouge"], [2, "text-rouge"], [3, "text2"], [14, "text2"],
    [15, "text-jaune"], [17, "text-jaune"], [18, "text-orange"], [19, "text-orange"],
    [20, "text-rouge"], [25, "text-rouge"],
  ])("pseudo de %i caractères : %s", (length, expected) => {
    expect(counterColorClass(length, NAME)).toBe(expected);
  });

  it("sans minimum, un champ vide reste neutre", () => {
    expect(counterColorClass(0, { warn: 400, danger: 450, max: 500 })).toBe("text2");
    expect(counterColorClass(401, { warn: 400, danger: 450, max: 500 })).toBe("text-jaune");
    expect(counterColorClass(451, { warn: 400, danger: 450, max: 500 })).toBe("text-orange");
    expect(counterColorClass(500, { warn: 400, danger: 450, max: 500 })).toBe("text-rouge");
  });
});

describe("CharCounter", () => {
  it("affiche longueur/max avec la classe de base et la couleur", () => {
    const { container } = render(<CharCounter value="abcdefghijklmnopq" {...NAME} className="base x" />);
    const p = container.querySelector("p")!;
    expect(p).toHaveTextContent("17/20");
    expect(p).toHaveClass("base", "x", "text-jaune");
  });

  it("gère une valeur absente", () => {
    const { container } = render(<CharCounter value={undefined} {...NAME} />);
    expect(container.querySelector("p")).toHaveTextContent("0/20");
  });
});
