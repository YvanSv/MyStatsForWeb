/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertiesView } from "./PropertiesView";
import type { PlacedWidget, SelectedWidget } from "./interfaces";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

// Panneaux de réglages stubés : ils exposent les settings reçus et permettent de déclencher onChange
const h = vi.hoisted(async () => {
  const { createElement } = await import("react");
  const stub = (name: string) => ({ settings, onChange }: { settings: any; onChange: (s: any) => void }) =>
    createElement("div", { "data-testid": `settings-${name}` },
      createElement("span", { "data-testid": "received" }, JSON.stringify(settings)),
      createElement("button", { onClick: () => onChange({ changed: name }) }, `modifier-${name}`));
  return { stub, setSelectedWidget: vi.fn(), setWidgets: vi.fn(), exportImage: vi.fn() };
});
vi.mock("./widgets/atomic/ProfilePictureWidget", async () => ({ ProfilePictureSettings: (await h).stub("profile_picture") }));
vi.mock("./widgets/atomic/UsernameWidget", async () => ({ UsernameSettings: (await h).stub("username") }));
vi.mock("./widgets/atomic/BackgroundWidget", async () => ({ BackgroundSettings: (await h).stub("background") }));
vi.mock("./widgets/atomic/BioWidget", async () => ({ BioSettings: (await h).stub("bio") }));
vi.mock("./widgets/stats/MinutesWidget", async () => ({ MinutesSettings: (await h).stub("minutes") }));
vi.mock("./widgets/stats/StreamsWidget", async () => ({ StreamsSettings: (await h).stub("streams") }));
vi.mock("./widgets/stats/DistinctTracksWidget", async () => ({ DistinctTracksSettings: (await h).stub("nb_tracks") }));
vi.mock("./widgets/stats/DistinctAlbumsWidget", async () => ({ DistinctAlbumsSettings: (await h).stub("nb_albums") }));
vi.mock("./widgets/stats/DistinctArtistsWidget", async () => ({ DistinctArtistsSettings: (await h).stub("nb_artists") }));


const hh = await h;
const TYPES = ["profile_picture", "username", "background", "bio", "minutes", "streams", "nb_tracks", "nb_albums", "nb_artists"];

const sel = (type: string, settings: any = { a: 1 }, id = 2): SelectedWidget => ({ id, type, settings }) as SelectedWidget;

const setup = (selectedWidget: SelectedWidget | null, widgets: PlacedWidget[] = []) =>
  render(
    <PropertiesView widgets={widgets} selectedWidget={selectedWidget} setSelectedWidget={hh.setSelectedWidget}
      setWidgets={hh.setWidgets} exportImage={hh.exportImage} />,
  );

beforeEach(() => {
  hh.setSelectedWidget.mockReset();
  hh.setWidgets.mockReset();
  hh.exportImage.mockReset();
});

describe("PropertiesView – rendu", () => {
  it("affiche le titre « Propriétés » comme titre de niveau 2", () => {
    setup(null);
    expect(screen.getByRole("heading", { level: 2, name: "Propriétés" })).toBeInTheDocument();
  });

  it("n'affiche aucun panneau de réglages sans widget sélectionné", () => {
    setup(null);
    expect(screen.queryByTestId(/^settings-/)).not.toBeInTheDocument();
    // seul reste l'en-tête de la section « Propriétés » (pliable)
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Propriétés"]);
  });

  it.each(TYPES)("pour le type %s, affiche uniquement son panneau avec ses settings", (type) => {
    setup(sel(type, { x: type }));
    expect(screen.getAllByTestId(/^settings-/)).toHaveLength(1);
    expect(screen.getByTestId(`settings-${type}`)).toBeInTheDocument();
    expect(screen.getByTestId("received")).toHaveTextContent(JSON.stringify({ x: type }));
  });

  it("affiche l'initiale en majuscule et le nom du type", () => {
    setup(sel("minutes"));
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("Temps d'écoute")).toBeInTheDocument();
  });

  it("n'affiche aucun panneau pour un type inconnu mais garde l'en-tête", () => {
    setup(sel("top_inconnu" as any));
    expect(screen.queryByTestId(/^settings-/)).not.toBeInTheDocument();
    expect(screen.getByText("top_inconnu")).toBeInTheDocument();
  });

  it("ne plante pas avec un type vide (initiale indéfinie)", () => {
    expect(() => setup(sel(""))).not.toThrow();
  });

  it("transmet des settings null/undefined au panneau sans planter", () => {
    setup(sel("bio", undefined));
    expect(screen.getByTestId("settings-bio")).toBeInTheDocument();
  });

  it("met à jour le panneau quand la sélection change", () => {
    const { rerender } = setup(sel("bio"));
    rerender(<PropertiesView widgets={[]} selectedWidget={sel("streams")} setSelectedWidget={hh.setSelectedWidget}
      setWidgets={hh.setWidgets} exportImage={hh.exportImage} />);
    expect(screen.queryByTestId("settings-bio")).not.toBeInTheDocument();
    expect(screen.getByTestId("settings-streams")).toBeInTheDocument();
  });

  it("n'appelle pas exportImage ni les setters au rendu", () => {
    setup(sel("bio"));
    expect(hh.exportImage).not.toHaveBeenCalled();
    expect(hh.setSelectedWidget).not.toHaveBeenCalled();
    expect(hh.setWidgets).not.toHaveBeenCalled();
  });
});

describe("PropertiesView – modification des réglages", () => {
  it("met à jour le widget sélectionné avec les nouveaux settings", async () => {
    setup(sel("bio", { a: 1 }, 7));
    await userEvent.click(screen.getByRole("button", { name: "modifier-bio" }));
    expect(hh.setSelectedWidget).toHaveBeenCalledWith({ id: 7, type: "bio", settings: { changed: "bio" } });
  });

  it("met à jour dans la liste uniquement le widget d'id correspondant", async () => {
    setup(sel("streams", {}, 2));
    await userEvent.click(screen.getByRole("button", { name: "modifier-streams" }));
    expect(hh.setWidgets).toHaveBeenCalledTimes(1);
    const updater = hh.setWidgets.mock.calls[0][0] as (p: PlacedWidget[]) => PlacedWidget[];
    const prev: PlacedWidget[] = [
      { id: 1, type: "bio", index: 0, w: 1, h: 1, settings: { k: 1 } as object },
      { id: 2, type: "streams", index: 1, w: 2, h: 1, settings: { k: 2 } as object },
    ];
    const next = updater(prev);
    expect(next[0]).toBe(prev[0]);
    expect(next[1]).toEqual({ ...prev[1], settings: { changed: "streams" } });
    expect(prev[1].settings).toEqual({ k: 2 }); // pas de mutation
  });

  it("l'updater laisse la liste inchangée si aucun id ne correspond", async () => {
    setup(sel("streams", {}, 99));
    await userEvent.click(screen.getByRole("button", { name: "modifier-streams" }));
    const updater = hh.setWidgets.mock.calls[0][0] as (p: PlacedWidget[]) => PlacedWidget[];
    const prev: PlacedWidget[] = [{ id: 1, type: "bio", index: 0, w: 1, h: 1, settings: {} }];
    expect(updater(prev)).toEqual(prev);
    expect(updater([])).toEqual([]);
  });

  it("fonctionne pour chaque type de widget", async () => {
    for (const type of TYPES) {
      hh.setSelectedWidget.mockReset();
      const { unmount } = setup(sel(type, {}, 5));
      await userEvent.click(screen.getByRole("button", { name: `modifier-${type}` }));
      expect(hh.setSelectedWidget).toHaveBeenCalledWith({ id: 5, type, settings: { changed: type } });
      unmount();
    }
  });

  it("est utilisable au clavier", async () => {
    const user = userEvent.setup();
    setup(sel("bio"));
    await user.tab(); // en-tête « Propriétés »
    await user.tab();
    expect(screen.getByRole("button", { name: "modifier-bio" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(hh.setSelectedWidget).toHaveBeenCalledTimes(1);
  });

  it("un id 0 est traité comme un widget valide", async () => {
    setup(sel("bio", {}, 0));
    await userEvent.click(screen.getByRole("button", { name: "modifier-bio" }));
    expect(hh.setSelectedWidget).toHaveBeenCalledWith({ id: 0, type: "bio", settings: { changed: "bio" } });
  });
});

const pwl = (id: number, type: string, index = 0, w = 1, h = 1): PlacedWidget =>
  ({ id, type, index, w, h, settings: { id } }) as PlacedWidget;

describe("PropertiesView – calques et ordre d'empilement", () => {
  const layers = [pwl(1, "bio", 0), pwl(2, "streams", 4, 2, 2), pwl(3, "minutes", 7)];
  const updaterOf = () => hh.setWidgets.mock.calls[0][0] as (p: PlacedWidget[]) => PlacedWidget[];

  it("liste les widgets du plus haut au plus bas, avec libellé, case et taille", () => {
    setup(null, layers);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Temps d'écoute");
    expect(items[0]).toHaveTextContent("Case 7 · 1×1");
    expect(items[1]).toHaveTextContent("Case 4 · 2×2");
    expect(items[2]).toHaveTextContent("Description");
  });

  it("s'affiche même sans widget sélectionné, et pas du tout sans widget", () => {
    const { unmount } = setup(null, layers);
    expect(screen.getByRole("heading", { level: 2, name: "Calques" })).toBeInTheDocument();
    unmount();
    setup(null, []);
    expect(screen.queryByRole("heading", { name: "Calques" })).not.toBeInTheDocument();
  });

  it("cliquer un calque sélectionne ce widget (id, type, réglages)", async () => {
    setup(null, layers);
    await userEvent.click(screen.getByRole("button", { name: /Description/ }));
    expect(hh.setSelectedWidget).toHaveBeenCalledWith({ id: 1, type: "bio", settings: { id: 1 } });
  });

  it("le calque sélectionné est marqué aria-pressed, les autres non", () => {
    setup(sel("streams", {}, 2), layers);
    expect(screen.getByRole("button", { name: /Case 4/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Case 7/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("la liste est utilisable au clavier", async () => {
    const user = userEvent.setup();
    setup(null, layers);
    await user.tab(); // en-tête « Propriétés »
    await user.tab(); // en-tête « Calques »
    await user.tab();
    expect(screen.getByRole("button", { name: /Case 7/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(hh.setSelectedWidget).toHaveBeenCalledWith({ id: 3, type: "minutes", settings: { id: 3 } });
  });

  it("« Calques » et « Propriétés » sont des sections pliables ; Calques n'est ouvert d'office qu'à partir de 2 widgets", async () => {
    const { unmount } = setup(null, [pwl(1, "bio")]);
    expect(screen.getByRole("button", { name: "Calques" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Propriétés" })).toHaveAttribute("aria-expanded", "true");
    unmount();
    setup(null, layers);
    const toggle = screen.getByRole("button", { name: "Calques" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveAttribute("inert");
  });

  it("structure : colonne pleine hauteur, Propriétés en flex-1 défilant, Calques ancré en bas (mt-auto) après lui", () => {
    setup(null, layers);
    const panel = screen.getByTestId("properties-panel");
    expect(panel).toHaveClass("flex", "flex-col", "flex-1", "min-h-0");
    expect(Array.from(panel.children).map((c) => c.getAttribute("data-testid"))).toEqual(["properties-section", "layers-section"]);
    expect(screen.getByTestId("properties-section")).toHaveClass("flex", "flex-col", "flex-1", "min-h-0");
    expect(screen.getByTestId("properties-section").className).not.toContain("max-h-[61vh]");
    expect(screen.getByTestId("layers-section")).toHaveClass("shrink-0", "mt-auto", "border-t", "border-white/10");
    expect(screen.getByRole("list")).toHaveClass("max-h-48", "overflow-y-auto");
  });

  it("Propriétés : l'en-tête reste fixe (hors du conteneur défilant), seul son contenu défile avec min-h-0", () => {
    setup(sel("bio"), layers);
    const toggle = screen.getByRole("button", { name: "Propriétés" });
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel).toHaveClass("min-h-0", "overflow-y-auto");
    expect(panel.contains(toggle)).toBe(false);
    expect(toggle.closest("h2")).toHaveClass("shrink-0");
    // toute la chaîne flex jusqu'au panneau porte min-h-0
    expect(panel.parentElement).toHaveClass("flex", "flex-col", "min-h-0");
    expect(screen.getByTestId("properties-section")).toHaveClass("min-h-0");
    expect(screen.getByTestId("properties-panel")).toHaveClass("min-h-0");
  });

  it("contours jamais rognés : anneaux à l'intérieur de la boîte (ring-inset), focus compris, et marge autour de la liste défilante", () => {
    setup(sel("streams", {}, 2), layers);
    const selected = screen.getByRole("button", { name: /Case 4/ });
    expect(selected).toHaveClass("ring-1", "ring-inset");
    for (const b of screen.getAllByRole("button", { name: /Case \d/ })) {
      expect(b).toHaveClass("focus-visible:ring-2", "focus-visible:ring-inset");
      expect(b.className).not.toMatch(/(^|\s)ring-offset/);
    }
    expect(screen.getByRole("list")).toHaveClass("p-1", "overflow-y-auto");
    // panneau de Propriétés : marge horizontale pour les contours de focus
    const toggle = screen.getByRole("button", { name: "Propriétés" });
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveClass("px-1");
  });

  it("sans widget, aucune section Calques (ni liste vide)", () => {
    setup(null, []);
    expect(screen.queryByTestId("layers-section")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calques" })).not.toBeInTheDocument();
  });

  it("n'affiche pas les boutons d'ordre sans sélection", () => {
    setup(null, layers);
    expect(screen.queryByRole("button", { name: "Premier plan" })).not.toBeInTheDocument();
  });

  it("les boutons d'ordre réordonnent le tableau pour le widget sélectionné", async () => {
    setup(sel("bio", {}, 1), layers);
    await userEvent.click(screen.getByRole("button", { name: "Premier plan" }));
    expect(updaterOf()(layers).map((w) => w.id)).toEqual([2, 3, 1]);
    hh.setWidgets.mockReset();
    await userEvent.click(screen.getByRole("button", { name: "Avancer" }));
    expect(updaterOf()(layers).map((w) => w.id)).toEqual([2, 1, 3]);
  });

  it("Reculer et Arrière-plan agissent vers le dessous", async () => {
    setup(sel("minutes", {}, 3), layers);
    await userEvent.click(screen.getByRole("button", { name: "Reculer" }));
    expect(updaterOf()(layers).map((w) => w.id)).toEqual([1, 3, 2]);
    hh.setWidgets.mockReset();
    await userEvent.click(screen.getByRole("button", { name: "Arrière-plan" }));
    expect(updaterOf()(layers).map((w) => w.id)).toEqual([3, 1, 2]);
  });

  it("désactive Premier plan/Avancer au sommet et Reculer/Arrière-plan en bas", () => {
    const { unmount } = setup(sel("minutes", {}, 3), layers);
    expect(screen.getByRole("button", { name: "Premier plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Avancer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reculer" })).toBeEnabled();
    unmount();
    setup(sel("bio", {}, 1), layers);
    expect(screen.getByRole("button", { name: "Arrière-plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reculer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Avancer" })).toBeEnabled();
  });

  it("traduit calques et boutons en anglais", () => {
    lang.current = "en";
    try {
      setup(sel("bio", {}, 1), layers);
      expect(screen.getByRole("heading", { level: 2, name: "Layers" })).toBeInTheDocument();
      for (const n of ["Bring to front", "Bring forward", "Send backward", "Send to back"]) {
        expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
      }
      expect(screen.getAllByText(/Cell \d/)).toHaveLength(3);
    } finally {
      lang.current = "fr";
    }
  });
});

describe("PropertiesView – anglais", () => {
  it("affiche le titre et le libellé traduit du type (pas l'identifiant brut)", () => {
    lang.current = "en";
    try {
      setup(sel("nb_tracks"));
      expect(screen.getByRole("heading", { level: 2, name: "Properties" })).toBeInTheDocument();
      expect(screen.getByText("Distinct tracks")).toBeInTheDocument();
      expect(screen.queryByText("nb_tracks")).not.toBeInTheDocument();
    } finally {
      lang.current = "fr";
    }
  });
});
