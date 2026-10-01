/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DistinctTracksWidget, DistinctTracksSettings } from "./DistinctTracksWidget";

const COLORS = ["#1DB954", "#FFFFFF", "#60A5FA", "#F472B6"];
const PROP = "data";
const ICON = "disc";

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const renderWidget = (w: number, h: number, value: number | undefined, settings: any) =>
  render(<DistinctTracksWidget w={w} h={h} {...({ [PROP]: value } as any)} settings={settings} />);

const swatches = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("button[style]")) as HTMLButtonElement[];

describe("DistinctTracksWidget", () => {
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

  it("affiche l'icône disc seulement si showIcon est actif", () => {
    const { container, rerender } = renderWidget(2, 2, 5, { showIcon: true });
    expect(container.querySelector(`svg.lucide-${ICON}`)).toBeInTheDocument();
    rerender(<DistinctTracksWidget w={2} h={2} {...({ [PROP]: 5 } as any)} settings={{ showIcon: false }} />);
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

describe("DistinctTracksSettings", () => {
  it("affiche le champ de titre, les pastilles et les deux options", () => {
    const { container } = render(<DistinctTracksSettings settings={{}} onChange={onChange} />);
    expect(screen.getByText("Titre du widget")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(swatches(container)).toHaveLength(COLORS.length);
    expect(screen.getByRole("button", { name: /Afficher l'icône/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abréger/ })).toBeInTheDocument();
  });

  it("propose les couleurs attendues, dans l'ordre", () => {
    const { container } = render(<DistinctTracksSettings settings={{}} onChange={onChange} />);
    const got = swatches(container).map((b) => b.style.backgroundColor);
    const expected = COLORS.map((c) => {
      const el = document.createElement("i");
      el.style.backgroundColor = c;
      return el.style.backgroundColor;
    });
    expect(got).toEqual(expected);
  });

  it.each(COLORS.map((c, i) => [c, i] as const))("clic sur la couleur %s : onChange avec fusion des réglages", async (c, i) => {
    const { container } = render(<DistinctTracksSettings settings={{ label: "L", shorten: true }} onChange={onChange} />);
    await userEvent.click(swatches(container)[i]);
    expect(onChange).toHaveBeenCalledWith({ label: "L", shorten: true, color: c });
  });

  it("met en évidence la couleur sélectionnée", () => {
    const { container } = render(<DistinctTracksSettings settings={{ color: COLORS[1] }} onChange={onChange} />);
    const b = swatches(container);
    expect(b[1]).toHaveClass("border-white");
    expect(b[0]).toHaveClass("border-transparent");
  });

  it("les pastilles de couleur ont un nom accessible", () => {
    const { container } = render(<DistinctTracksSettings settings={{}} onChange={onChange} />);
    for (const b of swatches(container)) expect(b).toHaveAccessibleName();
  });

  it("le champ de titre est associé à son label (nom accessible « Titre du widget »)", () => {
    render(<DistinctTracksSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "Titre du widget" })).toBeInTheDocument();
  });

  it("saisie du titre : onChange avec label fusionné", async () => {
    render(<DistinctTracksSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "A");
    expect(onChange).toHaveBeenCalledWith({ color: "#fff", label: "A" });
  });

  it("bascule showIcon", async () => {
    render(<DistinctTracksSettings settings={{ showIcon: false }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Afficher l'icône/ }));
    expect(onChange).toHaveBeenCalledWith({ showIcon: true });
  });

  it("bascule shorten", async () => {
    render(<DistinctTracksSettings settings={{ shorten: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Abréger/ }));
    expect(onChange).toHaveBeenCalledWith({ shorten: false });
  });

  it("ne mute pas l'objet settings reçu", async () => {
    const settings = { color: "#1DB954" };
    const { container } = render(<DistinctTracksSettings settings={settings} onChange={onChange} />);
    await userEvent.click(swatches(container)[1]);
    expect(settings).toEqual({ color: "#1DB954" });
  });

  it("est navigable au clavier jusqu'aux options", async () => {
    const user = userEvent.setup();
    render(<DistinctTracksSettings settings={{}} onChange={onChange} />);
    for (let i = 0; i < 1 + COLORS.length + 2; i++) await user.tab();
    expect(screen.getByRole("button", { name: /Abréger/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ shorten: true });
  });
});
