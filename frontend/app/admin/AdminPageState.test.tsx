import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPageState from "./AdminPageState";

describe("AdminPageState", () => {
  it("chargement : texte pulsant centré", () => {
    render(<AdminPageState variant="loading">Chargement</AdminPageState>);
    const el = screen.getByText("Chargement");
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("min-h-screen");
  });

  it("erreur : texte rouge, icône et classes additionnelles", () => {
    render(<AdminPageState variant="error" icon={<svg data-testid="i" />} className="bg-x">Oups</AdminPageState>);
    const el = screen.getByText("Oups");
    expect(el.className).toContain("text-red-400");
    expect(el.className).toContain("bg-x");
    expect(el.className).not.toContain("animate-pulse");
    expect(screen.getByTestId("i")).toBeInTheDocument();
  });
});
