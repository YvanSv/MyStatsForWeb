import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AvatarContainer from "./AvatarContainer";

describe("AvatarContainer", () => {
  it("affiche l'avatar et le titre", () => {
    render(<AvatarContainer url="a.png" title={<h1>Titre</h1>} />);
    expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "a.png");
    expect(screen.getByRole("heading", { name: "Titre" })).toBeInTheDocument();
  });

  it("sans url : pas d'attribut src", () => {
    render(<AvatarContainer url={undefined} />);
    expect(screen.getByAltText("Avatar")).not.toHaveAttribute("src");
  });

  it("profil spécial : cadre dégradé et pas de bordure", () => {
    render(<AvatarContainer url="a.png" special />);
    const img = screen.getByAltText("Avatar");
    expect(img.className).not.toContain("border-4");
    expect(img.parentElement!.className).toContain("animate-gradient-xy");
  });

  it("profil normal : bordure, pas de dégradé", () => {
    render(<AvatarContainer url="a.png" additional="extra" />);
    const img = screen.getByAltText("Avatar");
    expect(img.className).toContain("border-4");
    expect(img.parentElement!.className).not.toContain("animate-gradient-xy");
    expect(img.parentElement!.parentElement!.className).toContain("extra");
  });
});
