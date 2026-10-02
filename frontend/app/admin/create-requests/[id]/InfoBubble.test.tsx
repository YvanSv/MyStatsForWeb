import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import InfoBubble from "./InfoBubble";
import SectionTitle from "./SectionTitle";

describe("InfoBubble", () => {
  it("affiche libellé et valeur", () => {
    render(<InfoBubble label="Artiste" value="Moby" />);
    expect(screen.getByText("Artiste")).toBeInTheDocument();
    expect(screen.getByText("Moby")).toBeInTheDocument();
  });
  it("« — » pour une valeur vide", () => {
    render(<InfoBubble label="Id" value={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("SectionTitle", () => {
  it("affiche l'icône et le titre", () => {
    render(<SectionTitle icon={(p) => <svg data-testid="ic" {...p} />} title="Historique" />);
    expect(screen.getByRole("heading", { name: "Historique" })).toBeInTheDocument();
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });
});
