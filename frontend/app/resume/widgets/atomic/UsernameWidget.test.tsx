/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsernameSettings, UsernameWidget } from "./UsernameWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const renderWidget = (w: number, h: number, data: string, settings: any = {}) =>
  render(<UsernameWidget w={w} h={h} data={data} settings={settings} />);

describe("UsernameWidget", () => {
  describe("choix du layout", () => {
    it.each([
      [1, 1, "text-[10px]"],
      [2, 1, "text-lg"],
      [2, 2, "text-2xl"],
      [1, 2, "text-xl"],
      [1, 3, "text-xl"],
      [1, 4, "text-xl"],
    ])("%ix%i utilise la classe %s", (w, h, cls) => {
      renderWidget(w, h, "Yvan");
      expect(screen.getByText("Yvan")).toHaveClass(cls);
    });

    it("affiche le nom une seule fois", () => {
      renderWidget(2, 2, "Yvan");
      expect(screen.getAllByText("Yvan")).toHaveLength(1);
    });

    it("replie 3x3 sur 2x2", () => {
      renderWidget(3, 3, "Yvan");
      expect(screen.getByText("Yvan")).toHaveClass("text-2xl");
    });

    it("replie 3x1 sur 2x1", () => {
      renderWidget(3, 1, "Yvan");
      expect(screen.getByText("Yvan")).toHaveClass("text-lg");
    });

    it("replie 1x5 sur 1x4", () => {
      renderWidget(1, 5, "Yvan");
      expect(screen.getByText("Yvan")).toHaveClass("text-xl");
    });

    it.each([[1, 2], [1, 3], [1, 4]])("%ix%i écrit à la verticale", (w, h) => {
      renderWidget(w, h, "Yvan");
      expect(screen.getByText("Yvan")).toHaveStyle({ writingMode: "vertical-rl" });
      expect(screen.getByText("Yvan")).toHaveClass("rotate-180");
    });

    it("n'écrit pas à la verticale en 1x1, 2x1 et 2x2", () => {
      for (const [w, h] of [[1, 1], [2, 1], [2, 2]]) {
        const { unmount } = renderWidget(w, h, "Yvan");
        expect(screen.getByText("Yvan")).not.toHaveStyle({ writingMode: "vertical-rl" });
        unmount();
      }
    });

    it("tronque le texte en 1x1 et 2x1, le coupe en 2x2", () => {
      renderWidget(1, 1, "A");
      expect(screen.getByText("A")).toHaveClass("truncate");
      renderWidget(2, 2, "B");
      expect(screen.getByText("B")).toHaveClass("break-words");
    });
  });

  describe("style", () => {
    it("applique la couleur blanche par défaut", () => {
      renderWidget(2, 2, "Yvan");
      expect(screen.getByText("Yvan")).toHaveStyle({ color: "#fff" });
    });

    it("applique la couleur choisie", () => {
      renderWidget(2, 2, "Yvan", { color: "#FF5733" });
      expect(screen.getByText("Yvan")).toHaveStyle({ color: "#FF5733" });
    });

    it("applique italique et majuscules à la demande", () => {
      renderWidget(2, 2, "Yvan", { italic: true, uppercase: true });
      expect(screen.getByText("Yvan")).toHaveClass("italic", "uppercase");
    });

    it("n'applique ni italique ni majuscules par défaut", () => {
      renderWidget(2, 2, "Yvan");
      expect(screen.getByText("Yvan")).not.toHaveClass("italic");
      expect(screen.getByText("Yvan")).not.toHaveClass("uppercase");
    });

    it("italique/majuscules aussi dans les layouts vertical, 1x1 et 2x1", () => {
      for (const [w, h] of [[1, 1], [2, 1], [1, 3]]) {
        const { unmount } = renderWidget(w, h, "Yvan", { italic: true, uppercase: true });
        expect(screen.getByText("Yvan")).toHaveClass("italic", "uppercase");
        unmount();
      }
    });

    it("centre horizontalement et verticalement par défaut", () => {
      const { container } = renderWidget(2, 2, "Yvan");
      const box = screen.getByText("Yvan").parentElement!;
      expect(box).toHaveClass("items-center", "justify-center", "text-center");
      expect(screen.getByText("Yvan")).toHaveStyle({ textAlign: "center" });
      expect(container.firstElementChild).toHaveClass("overflow-hidden");
    });

    it.each([
      ["left", "justify-start", "text-left"],
      ["center", "justify-center", "text-center"],
      ["right", "justify-end", "text-right"],
    ])("alignement horizontal %s", (textAlign, j, t) => {
      renderWidget(2, 2, "Yvan", { textAlign });
      expect(screen.getByText("Yvan").parentElement).toHaveClass(j, t);
      expect(screen.getByText("Yvan")).toHaveStyle({ textAlign });
    });

    it.each([
      ["top", "items-start"],
      ["center", "items-center"],
      ["bottom", "items-end"],
    ])("alignement vertical %s", (verticalAlign, cls) => {
      renderWidget(2, 2, "Yvan", { verticalAlign });
      expect(screen.getByText("Yvan").parentElement).toHaveClass(cls);
    });

    it("ne produit pas de classe « undefined » pour un alignement inconnu", () => {
      renderWidget(2, 2, "Yvan", { textAlign: "justify", verticalAlign: "baseline" });
      expect(screen.getByText("Yvan").parentElement!.className).not.toContain("undefined");
    });
  });

  describe("données limites", () => {
    it("ne plante pas avec settings undefined ou null", () => {
      expect(() => renderWidget(2, 2, "Yvan", undefined)).not.toThrow();
      expect(() => renderWidget(2, 2, "Yvan", null)).not.toThrow();
    });

    it("affiche un nom vide sans erreur", () => {
      const { container } = renderWidget(2, 2, "");
      expect(container.querySelector("span")).toHaveTextContent("");
    });

    it("affiche un nom très long et les caractères spéciaux tels quels (échappés)", () => {
      const name = "<b>é</b>" + "x".repeat(300);
      renderWidget(2, 2, name);
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(document.querySelector("b")).toBeNull();
    });
  });
});

describe("UsernameSettings", () => {
  const swatches = (c: HTMLElement) => Array.from(c.querySelectorAll("button[style]")) as HTMLButtonElement[];
  const COLORS = ["#1DB954", "#FFFFFF", "#FF5733", "#3357FF", "#F1C40F"];

  it("affiche les sections et leurs boutons", () => {
    render(<UsernameSettings settings={{}} onChange={onChange} />);
    expect(screen.getByText("Couleur du texte")).toBeInTheDocument();
    expect(screen.getByText("Alignement Horizontal")).toBeInTheDocument();
    expect(screen.getByText("Alignement Vertical")).toBeInTheDocument();
    for (const n of ["ITALIQUE", "MAJUSCULES", "Gauche", "Centre", "Droite", "Haut", "Milieu", "Bas"]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
  });

  it("propose les 5 couleurs dans l'ordre", () => {
    const { container } = render(<UsernameSettings settings={{}} onChange={onChange} />);
    expect(swatches(container)).toHaveLength(5);
    swatches(container).forEach((b, i) => {
      const el = document.createElement("i");
      el.style.backgroundColor = COLORS[i];
      expect(b.style.backgroundColor).toBe(el.style.backgroundColor);
    });
  });

  it.each(COLORS.map((c, i) => [c, i] as const))("clic sur %s : fusionne la couleur", async (c, i) => {
    const { container } = render(<UsernameSettings settings={{ italic: true }} onChange={onChange} />);
    await userEvent.click(swatches(container)[i]);
    expect(onChange).toHaveBeenCalledWith({ italic: true, color: c });
  });

  it("met en évidence la couleur courante", () => {
    const { container } = render(<UsernameSettings settings={{ color: "#FF5733" }} onChange={onChange} />);
    expect(swatches(container)[2]).toHaveClass("border-white");
    expect(swatches(container)[0]).toHaveClass("border-transparent");
  });

  it("les pastilles de couleur ont un nom accessible", () => {
    const { container } = render(<UsernameSettings settings={{}} onChange={onChange} />);
    for (const b of swatches(container)) expect(b).toHaveAccessibleName();
  });

  it("ITALIQUE bascule italic (faux -> vrai, vrai -> faux)", async () => {
    const { rerender } = render(<UsernameSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "ITALIQUE" }));
    expect(onChange).toHaveBeenLastCalledWith({ italic: true });
    rerender(<UsernameSettings settings={{ italic: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "ITALIQUE" }));
    expect(onChange).toHaveBeenLastCalledWith({ italic: false });
  });

  it("MAJUSCULES bascule uppercase", async () => {
    const { rerender } = render(<UsernameSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "MAJUSCULES" }));
    expect(onChange).toHaveBeenLastCalledWith({ uppercase: true });
    rerender(<UsernameSettings settings={{ uppercase: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "MAJUSCULES" }));
    expect(onChange).toHaveBeenLastCalledWith({ uppercase: false });
  });

  it("marque visuellement les boutons actifs", () => {
    render(<UsernameSettings settings={{ italic: true, uppercase: false }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "ITALIQUE" })).toHaveClass("text-vert");
    expect(screen.getByRole("button", { name: "MAJUSCULES" })).not.toHaveClass("text-vert");
  });

  it.each([["Gauche", "left"], ["Centre", "center"], ["Droite", "right"]])("alignement horizontal %s -> %s", async (label, v) => {
    render(<UsernameSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenCalledWith({ color: "#fff", textAlign: v });
  });

  it.each([["Haut", "top"], ["Milieu", "center"], ["Bas", "bottom"]])("alignement vertical %s -> %s", async (label, v) => {
    render(<UsernameSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenCalledWith({ verticalAlign: v });
  });

  it("met en évidence l'alignement sélectionné", () => {
    render(<UsernameSettings settings={{ textAlign: "right", verticalAlign: "bottom" }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Droite" })).toHaveClass("text-white");
    expect(screen.getByRole("button", { name: "Gauche" })).toHaveClass("text-gray-500");
    expect(screen.getByRole("button", { name: "Bas" })).toHaveClass("text-white");
    expect(screen.getByRole("button", { name: "Haut" })).toHaveClass("text-gray-500");
  });

  it("est utilisable au clavier", async () => {
    const user = userEvent.setup();
    render(<UsernameSettings settings={{}} onChange={onChange} />);
    for (let i = 0; i < 5 + 1; i++) await user.tab();
    expect(screen.getByRole("button", { name: "ITALIQUE" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ italic: true });
  });

  it("ne mute pas settings", async () => {
    const settings = { color: "#fff" };
    render(<UsernameSettings settings={settings} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Bas" }));
    expect(settings).toEqual({ color: "#fff" });
  });

  it("plante avec settings undefined (accès sans ?.) : défaut", () => {
    expect(() => render(<UsernameSettings settings={undefined} onChange={onChange} />)).not.toThrow();
  });
});
