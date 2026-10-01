/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BioSettings, BioWidget } from "./BioWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const renderWidget = (w: number, h: number, bio: any, settings: any = {}) =>
  render(<BioWidget w={w} h={h} bio={bio} settings={settings} />);

describe("BioWidget", () => {
  it("affiche la bio en 1x1, tronquée sur 4 lignes et en italique", () => {
    renderWidget(1, 1, "Ma bio");
    const p = screen.getByText("Ma bio");
    expect(p).toHaveClass("line-clamp-4", "italic", "text-[8px]");
  });

  it("affiche la bio en 2x2 avec la taille par défaut text-[10px]", () => {
    renderWidget(2, 2, "Ma bio");
    expect(screen.getByText("Ma bio")).toHaveClass("text-[10px]");
    expect(screen.getByText("Ma bio")).not.toHaveClass("line-clamp-4");
  });

  it.each([[3, 3], [2, 3], [4, 2]])("replie %ix%i sur le layout 2x2", (w, h) => {
    renderWidget(w, h, "Ma bio");
    expect(screen.getByText("Ma bio")).not.toHaveClass("line-clamp-4");
  });

  it("replie 3x1 (horizontal sans 2x1) sur 1x1", () => {
    renderWidget(3, 1, "Ma bio");
    expect(screen.getByText("Ma bio")).toHaveClass("line-clamp-4");
  });

  it("replie un format vertical 1x3 sur 1x1", () => {
    renderWidget(1, 3, "Ma bio");
    expect(screen.getByText("Ma bio")).toHaveClass("line-clamp-4");
  });

  it("textes de repli différents selon le layout quand la bio est vide", () => {
    renderWidget(1, 1, "");
    expect(screen.getByText("Aucune bio disponible")).toBeInTheDocument();
    renderWidget(2, 2, "");
    expect(screen.getByText("Partagez votre univers musical ici...")).toBeInTheDocument();
  });

  it("utilise le texte de repli pour null et undefined", () => {
    renderWidget(2, 2, null);
    expect(screen.getByText("Partagez votre univers musical ici...")).toBeInTheDocument();
    renderWidget(1, 1, undefined);
    expect(screen.getByText("Aucune bio disponible")).toBeInTheDocument();
  });

  it("utilise la couleur grise par défaut puis la couleur choisie", () => {
    const { unmount } = renderWidget(2, 2, "Bio");
    expect(screen.getByText("Bio")).toHaveStyle({ color: "#9CA3AF" });
    unmount();
    renderWidget(2, 2, "Bio", { color: "#1DB954" });
    expect(screen.getByText("Bio")).toHaveStyle({ color: "#1DB954" });
  });

  it("applique la couleur aussi en 1x1", () => {
    renderWidget(1, 1, "Bio", { color: "#1DB954" });
    expect(screen.getByText("Bio")).toHaveStyle({ color: "#1DB954" });
  });

  it.each(["text-[8px]", "text-[10px]", "text-[13px]", "text-[16px]"])("applique la taille %s en 2x2", (fontSize) => {
    renderWidget(2, 2, "Bio", { fontSize });
    expect(screen.getByText("Bio")).toHaveClass(fontSize);
  });

  it.each(["text-[8px]", "text-[10px]", "text-[13px]", "text-[16px]"])("applique aussi la taille %s en 1x1", (fontSize) => {
    renderWidget(1, 1, "Bio", { fontSize });
    expect(screen.getByText("Bio")).toHaveClass(fontSize, "line-clamp-4", "italic");
  });

  it("garde la taille d'origine par layout sans fontSize (8px en 1x1, 10px en 2x2)", () => {
    const { unmount } = renderWidget(1, 1, "Bio");
    expect(screen.getByText("Bio")).toHaveClass("text-[8px]");
    unmount();
    renderWidget(2, 2, "Bio");
    expect(screen.getByText("Bio")).toHaveClass("text-[10px]");
  });

  it("n'applique qu'une seule taille en 1x1 quand fontSize est choisi", () => {
    renderWidget(1, 1, "Bio", { fontSize: "text-[16px]" });
    expect(screen.getByText("Bio")).not.toHaveClass("text-[8px]");
  });

  it.each([
    ["left", "items-start", "text-left"],
    ["center", "items-center", "text-center"],
    ["right", "items-end", "text-right"],
  ])("alignement %s", (textAlign, a, b) => {
    renderWidget(2, 2, "Bio", { textAlign });
    expect(screen.getByText("Bio").parentElement).toHaveClass(a, b);
  });

  it("aligne à gauche par défaut et pour une valeur inconnue", () => {
    const { unmount } = renderWidget(2, 2, "Bio");
    expect(screen.getByText("Bio").parentElement).toHaveClass("items-start", "text-left");
    unmount();
    renderWidget(2, 2, "Bio", { textAlign: "justify" });
    expect(screen.getByText("Bio").parentElement).toHaveClass("items-start");
  });

  it("affiche les guillemets en 2x2 seulement si showQuotes", () => {
    const { rerender } = renderWidget(2, 2, "Bio", { showQuotes: true });
    expect(screen.getByText("“")).toBeInTheDocument();
    expect(screen.getByText("”")).toBeInTheDocument();
    rerender(<BioWidget w={2} h={2} bio="Bio" settings={{ showQuotes: false }} />);
    expect(screen.queryByText("“")).not.toBeInTheDocument();
    expect(screen.queryByText("”")).not.toBeInTheDocument();
  });

  it("n'affiche pas les guillemets en 1x1 même avec showQuotes", () => {
    renderWidget(1, 1, "Bio", { showQuotes: true });
    expect(screen.queryByText("“")).not.toBeInTheDocument();
  });

  it("place les guillemets autour du texte", () => {
    renderWidget(2, 2, "Bio", { showQuotes: true });
    const kids = Array.from(screen.getByText("Bio").parentElement!.children).map((c) => c.textContent);
    expect(kids).toEqual(["“", "Bio", "”"]);
  });

  it("ne plante pas avec settings undefined ou null", () => {
    expect(() => renderWidget(2, 2, "Bio", undefined)).not.toThrow();
    expect(() => renderWidget(2, 2, "Bio", null)).not.toThrow();
  });

  it("affiche une bio de 500 caractères et le contenu HTML échappé", () => {
    const bio = "<i>a</i>" + "y".repeat(500);
    renderWidget(2, 2, bio);
    expect(screen.getByText(bio)).toBeInTheDocument();
    expect(document.querySelector("i")).toBeNull();
  });
});

describe("BioSettings", () => {
  it("affiche les sections et tous les boutons", () => {
    render(<BioSettings settings={{}} onChange={onChange} />);
    expect(screen.getByText("Couleur du texte")).toBeInTheDocument();
    expect(screen.getByText("Taille de lecture")).toBeInTheDocument();
    expect(screen.getByText("Alignement")).toBeInTheDocument();
    for (const n of ["XS", "S", "M", "L", "Gauche", "Centre", "Droite", /Style "Citation"/]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
  });

  it.each([["XS", "text-[8px]"], ["S", "text-[10px]"], ["M", "text-[13px]"], ["L", "text-[16px]"]])("taille %s -> %s", async (label, id) => {
    render(<BioSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenCalledWith({ color: "#fff", fontSize: id });
  });

  it.each([["Gauche", "left"], ["Centre", "center"], ["Droite", "right"]])("alignement %s -> %s", async (label, v) => {
    render(<BioSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenCalledWith({ textAlign: v });
  });

  it("met en évidence la taille et l'alignement courants", () => {
    render(<BioSettings settings={{ fontSize: "text-[13px]", textAlign: "center" }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "M" })).toHaveClass("text-white");
    expect(screen.getByRole("button", { name: "S" })).toHaveClass("text-gray-500");
    expect(screen.getByRole("button", { name: "Centre" })).toHaveClass("text-white");
    expect(screen.getByRole("button", { name: "Gauche" })).toHaveClass("text-gray-500");
  });

  it("bascule showQuotes dans les deux sens", async () => {
    const { rerender } = render(<BioSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Citation/ }));
    expect(onChange).toHaveBeenLastCalledWith({ showQuotes: true });
    rerender(<BioSettings settings={{ showQuotes: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Citation/ }));
    expect(onChange).toHaveBeenLastCalledWith({ showQuotes: false });
  });

  it("reflète l'état de l'interrupteur", () => {
    const { container, rerender } = render(<BioSettings settings={{ showQuotes: true }} onChange={onChange} />);
    expect(container.querySelector(".translate-x-3")).toBeInTheDocument();
    rerender(<BioSettings settings={{ showQuotes: false }} onChange={onChange} />);
    expect(container.querySelector(".translate-x-0")).toBeInTheDocument();
  });

  it("expose l'état de l'interrupteur aux technologies d'assistance", () => {
    render(<BioSettings settings={{ showQuotes: true }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /Citation/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("les boutons de taille ont une infobulle explicite (title) en plus de leur libellé XS/S/M/L", () => {
    render(<BioSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "XS" })).toHaveAttribute("title", "Taille XS");
  });

  it("est utilisable au clavier", async () => {
    const user = userEvent.setup();
    render(<BioSettings settings={{}} onChange={onChange} />);
    for (let i = 0; i < 6; i++) await user.tab(); // 5 pastilles de couleur, puis XS
    expect(screen.getByRole("button", { name: "XS" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ fontSize: "text-[8px]" });
  });

  it("ne plante pas avec settings undefined", () => {
    expect(() => render(<BioSettings settings={undefined} onChange={onChange} />)).not.toThrow();
  });

  describe("palette de couleurs", () => {
    const COLORS = ["#9CA3AF", "#FFFFFF", "#1DB954", "#38BDF8", "#F1C40F"];
    const NAMES: Record<string, string> = { "#9CA3AF": "Gris", "#FFFFFF": "Blanc", "#1DB954": "Vert", "#38BDF8": "Bleu ciel", "#F1C40F": "Jaune" };

    it("propose les couleurs attendues, la première étant le gris par défaut du rendu", () => {
      render(<BioSettings settings={{}} onChange={onChange} />);
      for (const c of COLORS) expect(screen.getByRole("button", { name: NAMES[c] })).toBeInTheDocument();
    });

    it.each(COLORS)("clic sur %s : onChange avec fusion des réglages", async (c) => {
      render(<BioSettings settings={{ fontSize: "text-[13px]" }} onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: NAMES[c] }));
      expect(onChange).toHaveBeenCalledWith({ fontSize: "text-[13px]", color: c });
    });

    it("marque le gris comme sélectionné quand aucune couleur n'est définie", () => {
      render(<BioSettings settings={{}} onChange={onChange} />);
      expect(screen.getByRole("button", { name: "Gris" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Blanc" })).toHaveAttribute("aria-pressed", "false");
    });

    it("expose la couleur choisie via aria-pressed et la bordure", () => {
      render(<BioSettings settings={{ color: "#1DB954" }} onChange={onChange} />);
      expect(screen.getByRole("button", { name: "Vert" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Vert" })).toHaveClass("border-white");
      expect(screen.getByRole("button", { name: "Gris" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Gris" })).toHaveClass("border-transparent");
    });

    it("la couleur choisie dans les réglages est appliquée par le widget", async () => {
      render(<BioSettings settings={{}} onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: "Bleu ciel" }));
      const next = onChange.mock.calls[0][0];
      render(<BioWidget w={2} h={2} bio="Rendu" settings={next} />);
      expect(screen.getByText("Rendu")).toHaveStyle({ color: "#38BDF8" });
    });
  });
});
