import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Layout1x1, Layout2x1, Layout2x2 } from "./common_layouts";

const icon = <svg data-testid="icon" />;
const layouts = { Layout1x1, Layout2x1, Layout2x2 };

describe.each(Object.entries(layouts))("%s", (_name, Layout) => {
  it("affiche la valeur et le libellé", () => {
    render(<Layout data={42} settings={{ label: "Streams" }} icon={icon} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Streams")).toBeInTheDocument();
  });

  it("affiche l'icône uniquement si showIcon est vrai", () => {
    const { rerender } = render(<Layout data={1} settings={{ showIcon: true }} icon={icon} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    rerender(<Layout data={1} settings={{ showIcon: false }} icon={icon} />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    rerender(<Layout data={1} settings={{}} icon={icon} />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });

  it("abrège la valeur quand shorten est actif", () => {
    render(<Layout data={1500} settings={{ shorten: true }} icon={icon} />);
    expect(screen.getByText("1.5k")).toBeInTheDocument();
  });

  it("n'abrège pas quand shorten est faux", () => {
    render(<Layout data={1500} settings={{ shorten: false }} icon={icon} />);
    expect(screen.queryByText("1.5k")).not.toBeInTheDocument();
    expect(screen.getByText(/^1\D?500$/)).toBeInTheDocument();
  });

  it("formate les milliers à la française (U+202F)", () => {
    render(<Layout data={1234567} settings={{}} icon={icon} />);
    expect(screen.getByText("1 234 567", { normalizer: (x) => x })).toBeInTheDocument();
  });

  it("affiche 0 pour une valeur nulle", () => {
    render(<Layout data={0} settings={{}} icon={icon} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("n'affiche pas de libellé quand label est absent", () => {
    const { container } = render(<Layout data={5} settings={{}} icon={icon} />);
    const empties = Array.from(container.querySelectorAll("span")).filter((s) => s.textContent === "");
    expect(empties.length).toBeLessThanOrEqual(1);
  });

  it("ne plante pas si settings est undefined (settings.shorten accédé sans ?.)", () => {
    expect(() => render(<Layout data={5} settings={undefined} icon={icon} />)).not.toThrow();
  });
});

describe("couleur", () => {
  it("Layout2x1 applique la couleur choisie à la valeur", () => {
    render(<Layout2x1 data={7} settings={{ color: "#A855F7" }} icon={icon} />);
    expect(screen.getByText("7")).toHaveStyle({ color: "#A855F7" });
  });

  it("Layout2x1 utilise le vert par défaut", () => {
    render(<Layout2x1 data={7} settings={{}} icon={icon} />);
    expect(screen.getByText("7")).toHaveStyle({ color: "#1DB954" });
  });

  it("Layout2x2 colore la valeur et la barre décorative", () => {
    const { container } = render(<Layout2x2 data={7} settings={{ color: "#38BDF8" }} icon={icon} />);
    expect(screen.getByText("7")).toHaveStyle({ color: "#38BDF8" });
    expect(container.querySelector(".h-1.w-12")).toHaveStyle({ backgroundColor: "#38BDF8" });
  });

  it("Layout2x2 utilise le vert par défaut pour la barre", () => {
    const { container } = render(<Layout2x2 data={7} settings={{}} icon={icon} />);
    expect(container.querySelector(".h-1.w-12")).toHaveStyle({ backgroundColor: "#1DB954" });
  });

  it("Layout1x1 garde un texte blanc quelle que soit la couleur", () => {
    render(<Layout1x1 data={7} settings={{ color: "#A855F7" }} icon={icon} />);
    expect(screen.getByText("7")).toHaveClass("text-white");
  });
});
