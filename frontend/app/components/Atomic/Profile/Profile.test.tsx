import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarContainer } from "./Profile";

let mockLang: "fr" | "en" = "fr";
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages[mockLang], language: mockLang, changeLanguage: vi.fn() }) };
});
afterEach(() => { mockLang = "fr"; });

describe("AvatarContainer", () => {
  it("affiche l'avatar et le nom d'utilisateur", () => {
    render(<AvatarContainer url="https://img/a.png" username="Yvan" />);
    expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "https://img/a.png");
    expect(screen.getByRole("heading", { level: 1, name: "Yvan" })).toBeInTheDocument();
  });

  it("alt de l'avatar : texte du dictionnaire anglais", () => {
    mockLang = "en";
    render(<AvatarContainer url="a.png" username="A" />);
    expect(screen.getByAltText("Avatar")).toBeInTheDocument();
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

  it("donne un cadre dégradé sans bordure au compte marqué spécial par le serveur", () => {
    const { container } = render(<AvatarContainer url="x.png" username="Yvan" special />);
    expect(screen.getByAltText("Avatar")).not.toHaveClass("border-4");
    expect(container.querySelector(".animate-gradient-xy")).toBeInTheDocument();
  });

  it("ne donne aucun style spécial à un pseudo « Yvantmtc » que le serveur n'a pas marqué (pas d'usurpation)", () => {
    const { container } = render(<AvatarContainer url="x.png" username="Yvantmtc" />);
    expect(screen.getByAltText("Avatar")).toHaveClass("border-4");
    expect(container.querySelector(".animate-gradient-xy")).not.toBeInTheDocument();
  });
});

describe("AvatarContainer – classes CSS", () => {
  const classesOf = (container: HTMLElement) =>
    [...container.querySelectorAll("[class]")].map((el) => el.getAttribute("class")).join(" ");

  it.each([["utilisateur standard", "Yvan", false], ["utilisateur spécial", "Yvan", true], ["sans nom", undefined, false]])(
    "n'écrit jamais « false » ni « undefined » dans les classes (%s)",
    (_label, username, special) => {
      const { container } = render(<AvatarContainer url="x.png" username={username} special={special} />);
      expect(classesOf(container)).not.toMatch(/\b(false|undefined|null)\b/);
    },
  );

  it("donne une bordure à l'avatar standard mais pas au spécial", () => {
    const { unmount } = render(<AvatarContainer url="x.png" username="Yvan" />);
    expect(screen.getByAltText("Avatar")).toHaveClass("border-4", "border-bg1");
    unmount();
    render(<AvatarContainer url="x.png" username="Yvan" special />);
    expect(screen.getByAltText("Avatar")).not.toHaveClass("border-4");
  });

  it("applique le dégradé animé uniquement à l'utilisateur spécial", () => {
    const { container, unmount } = render(<AvatarContainer url="x.png" username="Yvan" special />);
    expect(container.querySelector(".animate-gradient-xy")).toBeInTheDocument();
    unmount();
    const standard = render(<AvatarContainer url="x.png" username="Yvan" />);
    expect(standard.container.querySelector(".animate-gradient-xy")).not.toBeInTheDocument();
  });
});
