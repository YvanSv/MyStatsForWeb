import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CompactStatCard from "./CompactStatCard";

describe("CompactStatCard", () => {
  it("affiche le libellé et la valeur", () => {
    render(<CompactStatCard label="Temps" value="12 min" icon={<svg data-testid="icon" />} />);
    expect(screen.getByText("Temps")).toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
  });

  it("affiche l'icône fournie", () => {
    render(<CompactStatCard label="L" value="1" icon={<svg data-testid="icon" />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("affiche la sous-valeur quand elle est fournie", () => {
    render(<CompactStatCard label="L" value="1" subValue="+3 %" />);
    expect(screen.getByText("+3 %")).toBeInTheDocument();
  });

  it("n'affiche pas de sous-valeur quand elle est absente", () => {
    const { container } = render(<CompactStatCard label="L" value="1" />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("n'affiche pas de sous-valeur vide", () => {
    const { container } = render(<CompactStatCard label="L" value="1" subValue="" />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("affiche la valeur 0 (nombre)", () => {
    render(<CompactStatCard label="L" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("fonctionne sans icône", () => {
    render(<CompactStatCard label="L" value="v" />);
    expect(screen.getByText("v")).toBeInTheDocument();
  });

  it("affiche une valeur de chargement telle quelle", () => {
    render(<CompactStatCard label="L" value="..." />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("ne plante pas avec une valeur undefined", () => {
    const { container } = render(<CompactStatCard label="L" value={undefined} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("place le libellé avant la valeur dans l'ordre du document", () => {
    render(<CompactStatCard label="Label" value="Valeur" />);
    const label = screen.getByText("Label");
    const value = screen.getByText("Valeur");
    expect(label.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
