/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePictureSettings, ProfilePictureWidget } from "./ProfilePictureWidget";

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const user = (avatar: any) => ({ display_name: "Yvan", bio: "", avatar, banner: "", perms: [] });
const renderWidget = (settings: any = {}, avatar: any = "https://img/a.png", w = 1, h = 1) =>
  render(<ProfilePictureWidget w={w} h={h} user={user(avatar)} settings={settings} />);
const img = () => screen.getByRole("img");

describe("ProfilePictureWidget", () => {
  it("affiche l'avatar avec le bon src et un alt", () => {
    renderWidget();
    expect(img()).toHaveAttribute("src", "https://img/a.png");
    expect(img()).toHaveAttribute("alt", expect.stringMatching(/\S/));
  });

  it("n'a pas d'attribut src si l'avatar est vide ou null", () => {
    const { unmount } = renderWidget({}, "");
    expect(img()).not.toHaveAttribute("src");
    unmount();
    renderWidget({}, null);
    expect(img()).not.toHaveAttribute("src");
  });

  it("applique des coins arrondis (rounded-xl) et aucune bordure par défaut", () => {
    renderWidget();
    expect(img()).toHaveClass("rounded-xl", "border-0");
    expect(img()).not.toHaveClass("rounded-full");
    expect(img()).not.toHaveClass("border-vert");
  });

  it("devient rond avec round", () => {
    renderWidget({ round: true });
    expect(img()).toHaveClass("rounded-full");
    expect(img()).not.toHaveClass("rounded-xl");
  });

  it("affiche la bordure verte avec border", () => {
    renderWidget({ border: true });
    expect(img()).toHaveClass("border-2", "border-vert");
    expect(img()).not.toHaveClass("border-0");
  });

  it("zoom 1 par défaut", () => {
    renderWidget();
    expect(img().style.transform).toBe("scale(1)");
  });

  it.each([0.5, 1.5, 2])("applique un zoom de %s", (zoom) => {
    renderWidget({ zoom });
    expect(img().style.transform).toBe(`scale(${zoom})`);
  });

  it("conserve un zoom de 0 (?? et non ||)", () => {
    renderWidget({ zoom: 0 });
    expect(img().style.transform).toBe("scale(0)");
  });

  it("ne plante pas avec settings undefined ou null", () => {
    expect(() => renderWidget(undefined)).not.toThrow();
    expect(() => renderWidget(null)).not.toThrow();
  });

  it("affiche l'image quel que soit le format (3x3 replie sur 1x1)", () => {
    renderWidget({}, "https://img/a.png", 3, 3);
    expect(img()).toBeInTheDocument();
  });

  it("l'alt est localisable (pas de texte en dur « Avatar »)", () => {
    // Défaut : alt codé en dur et non traduit
    renderWidget();
    expect(img()).toHaveAttribute("alt", expect.stringMatching(/Yvan/));
  });
});

describe("ProfilePictureSettings", () => {
  it("affiche les deux bascules et le zoom", () => {
    render(<ProfilePictureSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Photo Arrondie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bordure MyStats" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByText("Zoom Image")).toBeInTheDocument();
  });

  it("bascule round dans les deux sens", async () => {
    const { rerender } = render(<ProfilePictureSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Photo Arrondie" }));
    expect(onChange).toHaveBeenLastCalledWith({ round: true });
    rerender(<ProfilePictureSettings settings={{ round: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Photo Arrondie" }));
    expect(onChange).toHaveBeenLastCalledWith({ round: false });
  });

  it("bascule border dans les deux sens", async () => {
    const { rerender } = render(<ProfilePictureSettings settings={{ zoom: 1.2 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Bordure MyStats" }));
    expect(onChange).toHaveBeenLastCalledWith({ zoom: 1.2, border: true });
    rerender(<ProfilePictureSettings settings={{ border: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Bordure MyStats" }));
    expect(onChange).toHaveBeenLastCalledWith({ border: false });
  });

  it("reflète l'état des interrupteurs", () => {
    const { container } = render(<ProfilePictureSettings settings={{ round: true, border: false }} onChange={onChange} />);
    const knobs = container.querySelectorAll("button > div > div");
    expect(knobs[0]).toHaveClass("translate-x-3");
    expect(knobs[1]).toHaveClass("translate-x-0");
  });

  it("le curseur a les bornes 0.5 à 2 par pas de 0.01 et vaut 1 par défaut", () => {
    render(<ProfilePictureSettings settings={{}} onChange={onChange} />);
    const s = screen.getByRole("slider");
    expect(s).toHaveAttribute("min", "0.5");
    expect(s).toHaveAttribute("max", "2");
    expect(s).toHaveAttribute("step", "0.01");
    expect(s).toHaveValue("1");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("affiche le pourcentage arrondi du zoom", () => {
    render(<ProfilePictureSettings settings={{ zoom: 1.256 }} onChange={onChange} />);
    expect(screen.getByText("126%")).toBeInTheDocument();
  });

  it("déplacer le curseur appelle onChange avec un nombre", () => {
    render(<ProfilePictureSettings settings={{ round: true }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1.5" } });
    expect(onChange).toHaveBeenCalledWith({ round: true, zoom: 1.5 });
  });

  it("le curseur de zoom a un nom accessible", () => {
    render(<ProfilePictureSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("slider", { name: /zoom/i })).toBeInTheDocument();
  });

  it("les interrupteurs exposent leur état (aria-pressed)", () => {
    render(<ProfilePictureSettings settings={{ round: true }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Photo Arrondie" })).toHaveAttribute("aria-pressed", "true");
  });

  it("ne plante pas avec settings undefined", () => {
    expect(() => render(<ProfilePictureSettings settings={undefined} onChange={onChange} />)).not.toThrow();
  });

  it("affiche le même zoom 0 que le widget (le réglage utilise || 1, le widget ?? 1)", () => {
    render(<ProfilePictureSettings settings={{ zoom: 0 }} onChange={onChange} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
