/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileWidget } from "./ProfileWidgets";
import type { UserProfile } from "../interfaces";

const user = (over: Partial<UserProfile> = {}): UserProfile => ({
  display_name: "Yvan", bio: "", avatar: "", banner: "", perms: [], ...over,
});

describe("ProfileWidget", () => {
  it.each([
    [1, 1, "text-[10px]"],
    [2, 1, "text-[15px]"],
    [3, 1, "text-[20px]"],
  ])("affiche le pseudo au format %ix%i avec la bonne taille de texte", (w, h, cls) => {
    render(<ProfileWidget w={w} h={h} user={user()} />);
    const el = screen.getByText("Yvan");
    expect(el.className).toContain(cls);
  });

  it("n'affiche qu'une seule occurrence du pseudo", () => {
    render(<ProfileWidget w={2} h={1} user={user()} />);
    expect(screen.getAllByText("Yvan")).toHaveLength(1);
  });

  it("tronque le texte (classe truncate) pour les pseudos longs", () => {
    const long = "A".repeat(200);
    render(<ProfileWidget w={1} h={1} user={user({ display_name: long })} />);
    expect(screen.getByText(long).className).toContain("truncate");
  });

  it("replie un format non défini (2x2) sur le layout 1x1", () => {
    render(<ProfileWidget w={2} h={2} user={user()} />);
    expect(screen.getByText("Yvan").className).toContain("text-[10px]");
  });

  it("replie 4x1 sur 3x1 quand il existe (w-1), sinon 1x1", () => {
    render(<ProfileWidget w={4} h={1} user={user()} />);
    expect(screen.getByText("Yvan")).toBeInTheDocument();
  });

  it("replie 1x3 sur 1x1", () => {
    render(<ProfileWidget w={1} h={3} user={user()} />);
    expect(screen.getByText("Yvan").className).toContain("text-[10px]");
  });

  it("affiche un span vide quand le pseudo est vide", () => {
    const { container } = render(<ProfileWidget w={1} h={1} user={user({ display_name: "" })} />);
    expect(container.querySelector("span")).toBeEmptyDOMElement();
  });

  it("ne plante pas si display_name est absent (undefined)", () => {
    expect(() => render(<ProfileWidget w={1} h={1} user={{} as any} />)).not.toThrow();
  });

  it("échappe le HTML contenu dans le pseudo", () => {
    const { container } = render(<ProfileWidget w={1} h={1} user={user({ display_name: "<b>x</b>" })} />);
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>x</b>")).toBeInTheDocument();
  });

  it("n'affiche pas l'avatar ni la bio", () => {
    render(<ProfileWidget w={3} h={1} user={user({ avatar: "http://a/b.png", bio: "ma bio" })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("ma bio")).not.toBeInTheDocument();
  });

  it("le conteneur occupe tout l'espace et masque le débordement", () => {
    const { container } = render(<ProfileWidget w={1} h={1} user={user()} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("w-full");
    expect(root.className).toContain("overflow-hidden");
  });
});
