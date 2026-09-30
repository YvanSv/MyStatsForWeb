import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarContainer } from "./Profile";

describe("AvatarContainer", () => {
  it("affiche l'avatar et le nom d'utilisateur", () => {
    render(<AvatarContainer url="https://img/a.png" username="Yvan" />);
    expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "https://img/a.png");
    expect(screen.getByRole("heading", { level: 1, name: "Yvan" })).toBeInTheDocument();
  });

  it("affiche '...' sans nom d'utilisateur", () => {
    render(<AvatarContainer url="x.png" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("...");
  });

  it("n'a pas d'attribut src quand l'url est vide ou absente", () => {
    const { rerender } = render(<AvatarContainer url="" username="A" />);
    expect(screen.getByAltText("Avatar")).not.toHaveAttribute("src");
    rerender(<AvatarContainer url={undefined} username="A" />);
    expect(screen.getByAltText("Avatar")).not.toHaveAttribute("src");
  });

  it("affiche le titre et les enfants", () => {
    render(
      <AvatarContainer url="x.png" username="A" title={<span>Badge titre</span>}>
        <button>Éditer</button>
      </AvatarContainer>
    );
    expect(screen.getByText("Badge titre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Éditer" })).toBeInTheDocument();
  });

  it("applique les classes additionnelles au conteneur", () => {
    const { container } = render(<AvatarContainer url="x.png" username="A" additional="mb-8" />);
    expect(container.firstElementChild).toHaveClass("mb-8");
  });

  it("donne une bordure à l'avatar standard", () => {
    const { container } = render(<AvatarContainer url="x.png" username="Autre" />);
    expect(screen.getByAltText("Avatar")).toHaveClass("border-4", "border-bg1");
    expect(container.querySelector(".animate-gradient-xy")).not.toBeInTheDocument();
  });

  it("donne un cadre dégradé sans bordure au compte spécial Yvantmtc", () => {
    const { container } = render(<AvatarContainer url="x.png" username="Yvantmtc" />);
    expect(screen.getByAltText("Avatar")).not.toHaveClass("border-4");
    expect(container.querySelector(".animate-gradient-xy")).toBeInTheDocument();
  });
});
