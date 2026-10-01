/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreamsWidget, StreamsSettings } from "./StreamsWidget";

const COLORS = ["#1DB954", "#FFFFFF", "#38BDF8", "#A855F7"];
const PROP = "streams";
const ICON = "play";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

const onChange = vi.fn();

beforeEach(() => {
  lang.current = "fr";
  onChange.mockReset();
});

const renderWidget = (w: number, h: number, value: number | undefined, settings: any) =>
  render(<StreamsWidget w={w} h={h} {...({ [PROP]: value } as any)} settings={settings} />);

const swatches = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("button[style]")) as HTMLButtonElement[];

describe("StreamsWidget", () => {
  it("affiche la valeur et le libellé en 1x1", () => {
    renderWidget(1, 1, 123, { label: "Titre" });
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText("Titre")).toBeInTheDocument();
  });

  it("utilise le layout 1x1 (petit texte) pour 1x1", () => {
    renderWidget(1, 1, 5, {});
    expect(screen.getByText("5")).toHaveClass("text-sm");
  });

  it("utilise le layout 2x1 (valeur en italique et colorée) pour 2x1", () => {
    renderWidget(2, 1, 5, { color: "#38BDF8" });
    expect(screen.getByText("5")).toHaveClass("text-xl");
    expect(screen.getByText("5")).toHaveStyle({ color: "#38BDF8" });
  });

  it("utilise le layout 2x2 pour 2x2", () => {
    renderWidget(2, 2, 5, {});
    expect(screen.getByText("5")).toHaveClass("text-4xl");
  });

  it.each([[3, 3], [4, 2], [3, 2]])("replie %ix%i sur le layout 2x2", (w, h) => {
    renderWidget(w, h, 5, {});
    expect(screen.getByText("5")).toHaveClass("text-4xl");
  });

  it("replie 3x1 sur le layout 2x1", () => {
    renderWidget(3, 1, 5, {});
    expect(screen.getByText("5")).toHaveClass("text-xl");
  });

  it("replie un format vertical (1x2) sur le layout 1x1", () => {
    renderWidget(1, 2, 5, {});
    expect(screen.getByText("5")).toHaveClass("text-sm");
  });

  it("affiche l'icône play seulement si showIcon est actif", () => {
    const { container, rerender } = renderWidget(2, 2, 5, { showIcon: true });
    expect(container.querySelector(`svg.lucide-${ICON}`)).toBeInTheDocument();
    rerender(<StreamsWidget w={2} h={2} {...({ [PROP]: 5 } as any)} settings={{ showIcon: false }} />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("colore l'icône du layout 1x1 avec la couleur choisie", () => {
    const { container } = renderWidget(1, 1, 5, { showIcon: true, color: "#A855F7" });
    expect(container.querySelector("svg")).toHaveStyle({ color: "#A855F7" });
  });

  it("colore l'icône du layout 1x1 en vert par défaut", () => {
    const { container } = renderWidget(1, 1, 5, { showIcon: true });
    expect(container.querySelector("svg")).toHaveStyle({ color: "#1DB954" });
  });

  it("garde l'icône des layouts 2x1 et 2x2 neutre (blanc translucide)", () => {
    const { container } = renderWidget(2, 1, 5, { showIcon: true, color: "#A855F7" });
    expect(container.querySelector("svg")).toHaveClass("opacity-20", "text-white");
  });

  it("abrège la valeur avec shorten", () => {
    renderWidget(1, 1, 2500000, { shorten: true });
    expect(screen.getByText("2.5M")).toBeInTheDocument();
  });

  it("sépare les milliers à la française (U+202F) sans shorten", () => {
    renderWidget(2, 2, 1234567, {});
    expect(screen.getByText("1 234 567", { normalizer: (x) => x })).toBeInTheDocument();
  });

  it("affiche 0", () => {
    renderWidget(1, 1, 0, {});
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("ne plante pas si settings est undefined", () => {
    expect(() => renderWidget(1, 1, 5, undefined)).not.toThrow();
  });

  it("ne plante pas si la valeur est absente (undefined)", () => {
    expect(() => renderWidget(1, 1, undefined, {})).not.toThrow();
  });
});

describe("StreamsSettings", () => {
  it("affiche le champ de titre, les pastilles et les deux options", () => {
    const { container } = render(<StreamsSettings settings={{}} onChange={onChange} />);
    expect(screen.getByText("Titre du widget")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(swatches(container)).toHaveLength(COLORS.length);
    expect(screen.getByRole("button", { name: /Afficher l'icône/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abréger/ })).toBeInTheDocument();
  });

  it("propose les couleurs attendues, dans l'ordre", () => {
    const { container } = render(<StreamsSettings settings={{}} onChange={onChange} />);
    const got = swatches(container).map((b) => b.style.backgroundColor);
    const expected = COLORS.map((c) => {
      const el = document.createElement("i");
      el.style.backgroundColor = c;
      return el.style.backgroundColor;
    });
    expect(got).toEqual(expected);
  });

  it.each(COLORS.map((c, i) => [c, i] as const))("clic sur la couleur %s : onChange avec fusion des réglages", async (c, i) => {
    const { container } = render(<StreamsSettings settings={{ label: "L", shorten: true }} onChange={onChange} />);
    await userEvent.click(swatches(container)[i]);
    expect(onChange).toHaveBeenCalledWith({ label: "L", shorten: true, color: c });
  });

  it("met en évidence la couleur sélectionnée", () => {
    const { container } = render(<StreamsSettings settings={{ color: COLORS[1] }} onChange={onChange} />);
    const b = swatches(container);
    expect(b[1]).toHaveClass("border-white");
    expect(b[0]).toHaveClass("border-transparent");
  });

  it("les pastilles de couleur ont un nom accessible", () => {
    const { container } = render(<StreamsSettings settings={{}} onChange={onChange} />);
    for (const b of swatches(container)) expect(b).toHaveAccessibleName();
  });

  it("le champ de titre est associé à son label (nom accessible « Titre du widget »)", () => {
    render(<StreamsSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "Titre du widget" })).toBeInTheDocument();
  });

  it("saisie du titre : onChange avec label fusionné", async () => {
    render(<StreamsSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "A");
    expect(onChange).toHaveBeenCalledWith({ color: "#fff", label: "A" });
  });

  it("bascule showIcon", async () => {
    render(<StreamsSettings settings={{ showIcon: false }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Afficher l'icône/ }));
    expect(onChange).toHaveBeenCalledWith({ showIcon: true });
  });

  it("bascule shorten", async () => {
    render(<StreamsSettings settings={{ shorten: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Abréger/ }));
    expect(onChange).toHaveBeenCalledWith({ shorten: false });
  });

  it("ne mute pas l'objet settings reçu", async () => {
    const settings = { color: "#1DB954" };
    const { container } = render(<StreamsSettings settings={settings} onChange={onChange} />);
    await userEvent.click(swatches(container)[1]);
    expect(settings).toEqual({ color: "#1DB954" });
  });

  it("est navigable au clavier jusqu'aux options", async () => {
    const user = userEvent.setup();
    render(<StreamsSettings settings={{}} onChange={onChange} />);
    for (let i = 0; i < 1 + COLORS.length + 2; i++) await user.tab();
    expect(screen.getByRole("button", { name: /Abréger/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ shorten: true });
  });
});

describe("titre par défaut (Streams)", () => {
  it.each([[1, 1], [2, 1], [2, 2], [3, 3]])("affiche le titre français par défaut en %ix%i quand label est absent", (w, h) => {
    renderWidget(w, h, 5, {});
    expect(screen.getByText("Streams")).toBeInTheDocument();
  });

  it("affiche le titre anglais par défaut quand la langue est l'anglais", () => {
    lang.current = "en";
    renderWidget(2, 2, 5, {});
    expect(screen.getByText("Streams")).toBeInTheDocument();
  });

  it("utilise le titre par défaut quand label est une chaîne vide", () => {
    renderWidget(2, 2, 5, { label: "" });
    expect(screen.getByText("Streams")).toBeInTheDocument();
  });

  it("un titre saisi reste prioritaire sur le titre par défaut", () => {
    renderWidget(2, 2, 5, { label: "Mon titre" });
    expect(screen.getByText("Mon titre")).toBeInTheDocument();
    expect(screen.queryByText("Streams")).not.toBeInTheDocument();
  });

  it("le champ « Titre du widget » montre le titre par défaut en placeholder (français puis anglais)", () => {
    const { unmount } = render(<StreamsSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "Titre du widget" })).toHaveAttribute("placeholder", "Streams");
    expect(screen.getByRole("textbox")).toHaveValue("");
    unmount();
    lang.current = "en";
    render(<StreamsSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Streams");
  });
});
