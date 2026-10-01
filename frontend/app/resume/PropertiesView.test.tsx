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

const sel = (type: string, settings: any = { a: 1 }, id = 2): SelectedWidget => ({ id, type, settings });

const setup = (selectedWidget: SelectedWidget | null) =>
  render(
    <PropertiesView selectedWidget={selectedWidget} setSelectedWidget={hh.setSelectedWidget}
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
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
    setup(sel("top_tracks"));
    expect(screen.queryByTestId(/^settings-/)).not.toBeInTheDocument();
    expect(screen.getByText("top_tracks")).toBeInTheDocument();
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
    rerender(<PropertiesView selectedWidget={sel("streams")} setSelectedWidget={hh.setSelectedWidget}
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
      { id: 1, type: "bio", index: 0, w: 1, h: 1, settings: { k: 1 } },
      { id: 2, type: "streams", index: 1, w: 2, h: 1, settings: { k: 2 } },
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
