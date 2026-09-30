import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoubleFrame, SkeletonDoubleFrame } from "./DoubleFrame";

const props = () => ({
  icons: [<span key="a" data-testid="icon-a" />, <span key="b" data-testid="icon-b" />],
  titles: ["Titre gauche", "Titre droite"],
  subtitles: ["Sous-titre gauche", "Sous-titre droite"],
  contents: [<div key="a">Contenu gauche</div>, <div key="b">Contenu droite</div>],
});

describe("DoubleFrame", () => {
  it("affiche titres, sous-titres et contenus des deux colonnes", () => {
    render(<DoubleFrame {...props()} />);
    for (const txt of ["Titre gauche", "Titre droite", "Sous-titre gauche", "Sous-titre droite", "Contenu gauche", "Contenu droite"]) {
      expect(screen.getByText(txt)).toBeInTheDocument();
    }
  });

  it("place chaque icône dans sa colonne", () => {
    render(<DoubleFrame {...props()} />);
    const left = screen.getByText("Titre gauche").closest("div")!.parentElement!;
    const right = screen.getByText("Titre droite").closest("div")!.parentElement!;
    expect(left).toContainElement(screen.getByTestId("icon-a"));
    expect(right).toContainElement(screen.getByTestId("icon-b"));
    expect(left).not.toContainElement(screen.getByTestId("icon-b"));
  });

  it("fonctionne sans icônes", () => {
    const { icons: _icons, ...rest } = props();
    void _icons;
    render(<DoubleFrame {...rest} />);
    expect(screen.getByText("Titre gauche")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-a")).not.toBeInTheDocument();
  });

  it("rend le séparateur entre les colonnes", () => {
    const { container } = render(<DoubleFrame {...props()} />);
    expect(container.querySelector(".hidden.lg\\:flex")).toBeInTheDocument();
  });
});

describe("SkeletonDoubleFrame", () => {
  it("affiche les contenus et des placeholders animés pour chaque colonne", () => {
    const { container } = render(
      <SkeletonDoubleFrame contents={[<div key="a">Gauche</div>, <div key="b">Droite</div>]} />
    );
    expect(screen.getByText("Gauche")).toBeInTheDocument();
    expect(screen.getByText("Droite")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });
});
