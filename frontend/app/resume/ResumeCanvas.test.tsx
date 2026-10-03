/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResumeCanvas from "./ResumeCanvas";
import type { PlacedWidget } from "./interfaces";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

// --- Mocks : chaque widget expose ses props -----------------------------------
const stub = vi.hoisted(() => async (name: string, key: string, actual: object) => {
  const { createElement } = await import("react");
  return {
    ...actual,
    [name]: (p: any) =>
      createElement(
        "div",
        { "data-testid": `w-${key}`, "data-w": p.w, "data-h": p.h },
        JSON.stringify({ ...p, w: undefined, h: undefined }),
      ),
  };
});
vi.mock("./widgets/TopFiveWidget", () => ({ TopFiveWidget: () => null, TopFiveSettings: () => null, Thumb: () => null }));
vi.mock("./widgets/atomic/ProfilePictureWidget", async (importOriginal) => await stub("ProfilePictureWidget", "profile_picture", await importOriginal()));
vi.mock("./widgets/atomic/UsernameWidget", async (importOriginal) => await stub("UsernameWidget", "username", await importOriginal()));
vi.mock("./widgets/atomic/BackgroundWidget", async (importOriginal) => await stub("BackgroundWidget", "background", await importOriginal()));
vi.mock("./widgets/atomic/BioWidget", async (importOriginal) => await stub("BioWidget", "bio", await importOriginal()));
vi.mock("./widgets/stats/MinutesWidget", async (importOriginal) => await stub("MinutesWidget", "minutes", await importOriginal()));
vi.mock("./widgets/stats/StreamsWidget", async (importOriginal) => await stub("StreamsWidget", "streams", await importOriginal()));
vi.mock("./widgets/stats/DistinctTracksWidget", async (importOriginal) => await stub("DistinctTracksWidget", "nb_tracks", await importOriginal()));
vi.mock("./widgets/stats/DistinctAlbumsWidget", async (importOriginal) => await stub("DistinctAlbumsWidget", "nb_albums", await importOriginal()));
vi.mock("./widgets/stats/DistinctArtistsWidget", async (importOriginal) => await stub("DistinctArtistsWidget", "nb_artists", await importOriginal()));

// --- Helpers ----------------------------------------------------------------
const resumeData = {
  user: { display_name: "Yvan", bio: "Ma bio", banner: "b.png", avatar: "a.png", perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true } },
  topArtists: [], topTracks: [], topAlbums: [],
  minutes: 1234, streams: 567, distinct_tracks: 11, distinct_albums: 22, distinct_artists: 33,
};

const pw = (over: Record<string, unknown> = {}): PlacedWidget => ({
  id: 1, type: "username", index: 0, w: 1, h: 1, settings: { color: "red" }, ...over,
});

const h = vi.hoisted(() => ({ onSelect: vi.fn(), setWidgets: vi.fn() }));

// `selectedId` (facultatif) pilote la sélection comme le fait la page ; poubelle et poignées n'existent que pour le widget sélectionné
const renderCanvas = (widgets: PlacedWidget[], data: any = resumeData, range: string | number = "2025", selectedId?: number | null) =>
  render(
    <ResumeCanvas range={range} resumeData={data} widgets={widgets} setWidgets={h.setWidgets} onSelectWidget={h.onSelect} selectedId={selectedId} />,
  );
const renderSelected = (widgets: PlacedWidget[], selectedId = widgets[0]?.id ?? null) => renderCanvas(widgets, resumeData, "2025", selectedId);

// Version avec état réel pour les redimensionnements et suppressions
let latest: PlacedWidget[] = [];
function Stateful({ initial, selected }: { initial: PlacedWidget[]; selected?: number | null }) {
  const [widgets, setWidgets] = useState(initial);
  useEffect(() => { latest = widgets; }, [widgets]);
  return <ResumeCanvas range="y" resumeData={resumeData} widgets={widgets} setWidgets={setWidgets} onSelectWidget={h.onSelect} selectedId={selected === undefined ? initial[0]?.id ?? null : selected} />;
}

const gridEl = (c: HTMLElement) => c.querySelector(".relative.p-2") as HTMLElement;
const cells = (c: HTMLElement) => c.querySelectorAll(".aspect-square");
const widgetBox = (c: HTMLElement) => c.querySelector(".pointer-events-auto") as HTMLElement;
const handle = (c: HTMLElement, pos: string) => c.querySelector(`.cursor-${pos}-resize`) as HTMLElement;

// jsdom n'a pas de DragEvent : on fixe relatedTarget à la main sur un Event générique
const dragLeaveTo = (from: Element, to: Element | null) => {
  const ev = new Event("dragleave", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "relatedTarget", { value: to });
  act(() => { from.dispatchEvent(ev); });
};

const dataTransfer = (type: string, data: string) => ({
  dropEffect: "",
  getData: (k: string) => (k === "widgetType" ? type : data),
});

beforeEach(() => {
  h.onSelect.mockReset();
  h.setWidgets.mockReset();
  latest = [];
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    { left: 0, top: 0, width: 300, height: 500, right: 300, bottom: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
  );
});
afterEach(() => vi.restoreAllMocks());

// --- Tests --------------------------------------------------------------------
describe("ResumeCanvas – rendu", () => {
  it("affiche la grille de 15 cases numérotées de 0 à 14", () => {
    const { container } = renderCanvas([]);
    expect(cells(container)).toHaveLength(15);
    expect(cells(container)[0]).toHaveTextContent("0");
    expect(cells(container)[14]).toHaveTextContent("14");
  });

  it("affiche le branding et la période", () => {
    renderCanvas([], resumeData, "Année 2025");
    expect(screen.getByText("Propulsé par MyStats")).toBeInTheDocument();
    expect(screen.getByText("Année 2025")).toBeInTheDocument();
  });

  it("accepte une période numérique", () => {
    renderCanvas([], resumeData, 2024);
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("expose le conteneur de capture", () => {
    const { container } = renderCanvas([]);
    expect(container.querySelector("#capture-canvas")).toBeInTheDocument();
  });

  it("rend la grille visible quand il n'y a aucun widget", () => {
    const { container } = renderCanvas([]);
    expect((container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity).toBe("1");
  });

  it("masque la grille quand des widgets sont placés", () => {
    const { container } = renderCanvas([pw()]);
    expect((container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity).toBe("0");
  });

  it("ne rend aucun widget pour une liste vide", () => {
    const { container } = renderCanvas([]);
    expect(container.querySelector(".pointer-events-auto")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Supprimer le widget")).not.toBeInTheDocument();
  });

  it("ignore un type de widget inconnu (boîte vide mais présente)", () => {
    const { container } = renderCanvas([pw({ type: "inconnu" })]);
    expect(widgetBox(container)).toBeInTheDocument();
    expect(screen.queryByTestId(/^w-/)).not.toBeInTheDocument();
  });
});

describe("ResumeCanvas – données transmises aux widgets", () => {
  it.each([
    ["profile_picture", resumeData.user],
    ["username", "Yvan"],
    ["background", "b.png"],
    ["bio", "Ma bio"],
    ["minutes", 1234],
    ["streams", 567],
    ["nb_tracks", 11],
    ["nb_albums", 22],
    ["nb_artists", 33],
  ])("type %s : reçoit la donnée fraîche de resumeData", (type, expected) => {
    renderCanvas([pw({ type })]);
    const props = JSON.parse(screen.getByTestId(`w-${type}`).textContent!);
    const value = Object.values(props).find((v) => v !== undefined && JSON.stringify(v) !== JSON.stringify(pw().settings));
    expect(value).toEqual(expected);
  });

  it("transmet les settings et la taille du widget", () => {
    renderCanvas([pw({ type: "streams", w: 2, h: 3, settings: { a: 1 } })]);
    const el = screen.getByTestId("w-streams");
    expect(el).toHaveAttribute("data-w", "2");
    expect(el).toHaveAttribute("data-h", "3");
    expect(JSON.parse(el.textContent!).settings).toEqual({ a: 1 });
  });

  it("utilise les données actualisées lors d'un nouveau rendu", () => {
    const { rerender } = renderCanvas([pw({ type: "minutes" })]);
    rerender(
      <ResumeCanvas range="y" resumeData={{ ...resumeData, minutes: 9 }} widgets={[pw({ type: "minutes" })]}
        setWidgets={h.setWidgets} onSelectWidget={h.onSelect} />,
    );
    expect(JSON.parse(screen.getByTestId("w-minutes").textContent!).minutes).toBe(9);
  });

  it("valeur 0 transmise telle quelle", () => {
    renderCanvas([pw({ type: "streams" })], { ...resumeData, streams: 0 });
    expect(JSON.parse(screen.getByTestId("w-streams").textContent!).streams).toBe(0);
  });

  it("ne plante pas pour un widget utilisateur quand resumeData.user est absent", () => {
    expect(() => renderCanvas([pw({ type: "username" })], { ...resumeData, user: undefined })).not.toThrow();
  });
});

describe("ResumeCanvas – positionnement", () => {
  it.each([
    [0, 1, 1], [1, 2, 1], [2, 3, 1], [4, 2, 2], [14, 3, 5],
  ])("index %i : colonne %i, ligne %i", (index, col, row) => {
    const { container } = renderCanvas([pw({ index })]);
    const style = widgetBox(container).style;
    expect(style.gridColumn).toBe(`${col} / span 1`);
    expect(style.gridRow).toBe(`${row} / span 1`);
  });

  it("applique la taille w/h via span", () => {
    const { container } = renderCanvas([pw({ index: 3, w: 2, h: 3 })]);
    const style = widgetBox(container).style;
    expect(style.gridColumn).toBe("1 / span 2");
    expect(style.gridRow).toBe("2 / span 3");
  });
});

describe("ResumeCanvas – empilement", () => {
  const boxes = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".pointer-events-auto.group"));
  const stack = [pw({ id: 10, index: 0, w: 2, h: 2 }), pw({ id: 20, index: 1 }), pw({ id: 30, index: 0 })];

  it("chaque widget a un z-index égal à sa position dans le tableau + 1 (le dernier est au-dessus)", () => {
    const { container } = renderCanvas(stack);
    expect(boxes(container).map((b) => b.style.zIndex)).toEqual(["1", "2", "3"]);
  });

  it("le DOM suit l'ordre du tableau", () => {
    const { container } = renderCanvas([stack[2], stack[0], stack[1]]);
    expect(boxes(container).map((b) => b.style.zIndex)).toEqual(["1", "2", "3"]);
    expect(boxes(container)[0].style.gridColumn).toBe("1 / span 1"); // le widget 30 (1x1 en case 0) est dessous
  });

  it("sélectionner un widget n'altère jamais l'ordre d'empilement visible (pas de z-50)", async () => {
    const { container } = renderCanvas(stack);
    await userEvent.click(boxes(container)[0]);
    expect(boxes(container)[0]).toHaveAttribute("data-selected", "true");
    expect(boxes(container).map((b) => b.style.zIndex)).toEqual(["1", "2", "3"]);
    expect(container.querySelector(".z-50")).not.toBeInTheDocument();
    expect(container.querySelector(".hover\\:z-30")).not.toBeInTheDocument();
  });

  it("anneau, poubelle et poignées du widget recouvert sont dans une surimpression au-dessus de tous les widgets, exclue de l'export", () => {
    const { container } = renderSelected(stack, 10);
    const overlay = screen.getByTestId("selection-overlay");
    expect(overlay).toHaveAttribute("data-export-ignore", "true");
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(Math.max(...boxes(container).map((b) => Number(b.style.zIndex))));
    expect(overlay.querySelector(".ring-2")).toBeInTheDocument();
    expect(overlay.querySelector(".cursor-se-resize")).toBeInTheDocument();
    expect(overlay.querySelector('[title="Supprimer le widget"]')).toBeInTheDocument();
    // même emplacement que le widget 10 (2x2 en case 0)
    expect((overlay.firstElementChild as HTMLElement).style.gridColumn).toBe("1 / span 2");
    expect((overlay.firstElementChild as HTMLElement).style.gridRow).toBe("1 / span 2");
  });

  it("pas de surimpression sans sélection, ni pour un id absent", () => {
    renderCanvas(stack);
    expect(screen.queryByTestId("selection-overlay")).not.toBeInTheDocument();
    cleanup();
    renderCanvas(stack, resumeData, "2025", 999);
    expect(screen.queryByTestId("selection-overlay")).not.toBeInTheDocument();
  });

  it("la sélection pilotée par le parent (liste des calques) met en évidence le widget, sans clic", () => {
    const { container } = renderCanvas(stack, resumeData, "2025", 20);
    expect(boxes(container).map((b) => b.getAttribute("data-selected"))).toEqual([null, "true", null]);
  });

  it("l'export ne contient que les widgets dans l'ordre réel : tout le reste est exclu", () => {
    const { container } = renderSelected(stack, 10);
    const kept = boxes(container);
    for (const b of kept) expect(b.closest('[data-export-ignore="true"]')).toBeNull();
    expect(kept.map((b) => b.style.zIndex)).toEqual(["1", "2", "3"]);
  });
});

describe("ResumeCanvas – sélection", () => {
  it("cliquer un widget le sélectionne et notifie le parent", async () => {
    const { container } = renderCanvas([pw({ id: 7, type: "bio", settings: { s: 1 } })]);
    await userEvent.click(widgetBox(container));
    expect(h.onSelect).toHaveBeenCalledWith({ id: 7, type: "bio", settings: { s: 1 } });
    expect(widgetBox(container)).toHaveAttribute("data-selected", "true");
    expect(container.querySelector(".ring-2")).toBeInTheDocument();
  });

  it("un widget non sélectionné n'a pas d'anneau", () => {
    const { container } = renderCanvas([pw()]);
    expect(widgetBox(container)).not.toHaveAttribute("data-selected");
    expect(container.querySelector(".ring-2")).not.toBeInTheDocument();
  });

  it("sélectionner un autre widget déplace la sélection", async () => {
    const { container } = renderCanvas([pw({ id: 1 }), pw({ id: 2, index: 1 })]);
    const boxes = container.querySelectorAll(".pointer-events-auto");
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    expect(boxes[0]).not.toHaveAttribute("data-selected");
    expect(boxes[1]).toHaveAttribute("data-selected", "true");
    expect(h.onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("cliquer sur le fond de la zone désélectionne", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    fireEvent.click(gridEl(container));
    expect(h.onSelect).toHaveBeenCalledWith(null);
    expect(widgetBox(container)).not.toHaveAttribute("data-selected");
    expect(container.querySelector(".ring-2")).not.toBeInTheDocument();
  });

  it("cliquer sur une case de la grille ne désélectionne pas", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    fireEvent.click(cells(container)[5]);
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("la touche Échap désélectionne", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    await userEvent.keyboard("{Escape}");
    expect(h.onSelect).toHaveBeenLastCalledWith(null);
    expect(widgetBox(container)).not.toHaveAttribute("data-selected");
    expect(container.querySelector(".ring-2")).not.toBeInTheDocument();
  });

  it("les autres touches ne désélectionnent pas", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    await userEvent.keyboard("a{Enter}");
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("Échap utilise le onSelectWidget le plus récent après un nouveau rendu", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<ResumeCanvas range="y" resumeData={resumeData} widgets={[pw()]} setWidgets={h.setWidgets} onSelectWidget={first} />);
    rerender(<ResumeCanvas range="y" resumeData={resumeData} widgets={[pw()]} setWidgets={h.setWidgets} onSelectWidget={second} />);
    await userEvent.keyboard("{Escape}");
    expect(second).toHaveBeenCalledWith(null);
    expect(first).not.toHaveBeenCalled();
  });

  it("n'ajoute l'écouteur clavier qu'une fois malgré les nouveaux rendus", () => {
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = renderCanvas([pw()]);
    rerender(<ResumeCanvas range="z" resumeData={resumeData} widgets={[pw()]} setWidgets={h.setWidgets} onSelectWidget={vi.fn()} />);
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
  });

  it("retire l'écouteur clavier au démontage", async () => {
    const { unmount } = renderCanvas([pw()]);
    unmount();
    h.onSelect.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(h.onSelect).not.toHaveBeenCalled();
  });
});

describe("ResumeCanvas – suppression", () => {
  it("le bouton supprimer a un titre accessible (et n'existe que pour le widget sélectionné)", () => {
    renderCanvas([pw()]);
    expect(screen.queryByRole("button", { name: "Supprimer le widget" })).not.toBeInTheDocument();
    cleanup();
    renderSelected([pw()]);
    expect(screen.getByRole("button", { name: "Supprimer le widget" })).toBeInTheDocument();
  });

  it("supprime le widget ciblé uniquement", async () => {
    render(<Stateful initial={[pw({ id: 1 }), pw({ id: 2, index: 1 })]} />);
    await userEvent.click(screen.getAllByTitle("Supprimer le widget")[0]);
    expect(latest.map((w) => w.id)).toEqual([2]);
  });

  it("n'appelle pas la sélection quand on supprime (stopPropagation)", async () => {
    renderSelected([pw()]);
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    // seule la désélection (null) est notifiée, jamais une sélection du widget
    expect(h.onSelect.mock.calls.every(([arg]) => arg === null)).toBe(true);
  });

  it("supprimer le widget sélectionné vide les propriétés du parent", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    expect(h.onSelect).toHaveBeenCalledWith(null);
  });

  it("la poubelle ne supprime que le widget sélectionné, pas ceux qui le recouvrent", async () => {
    render(<Stateful initial={[pw({ id: 1 }), pw({ id: 2 })]} selected={1} />);
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    expect(latest.map((w) => w.id)).toEqual([2]);
  });

  it("setWidgets reçoit un updater qui filtre par id", async () => {
    renderSelected([pw({ id: 5 })]);
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    const updater = h.setWidgets.mock.calls[0][0];
    expect(updater([pw({ id: 5 }), pw({ id: 6 })])).toEqual([pw({ id: 6 })]);
    expect(updater([])).toEqual([]);
  });
});

describe("ResumeCanvas – glisser-déposer", () => {
  it("survoler la zone affiche la grille, quitter la masque", () => {
    const { container } = renderCanvas([pw()]);
    const layer = () => (container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity;
    fireEvent.dragOver(gridEl(container));
    expect(layer()).toBe("1");
    fireEvent.dragLeave(gridEl(container));
    expect(layer()).toBe("0");
  });

  it("passer d'une cellule à l'autre (relatedTarget dans la grille) garde la grille visible", () => {
    const { container } = renderCanvas([pw()]);
    const layer = () => (container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity;
    fireEvent.dragOver(gridEl(container));
    dragLeaveTo(cells(container)[3], cells(container)[4]);
    expect(layer()).toBe("1");
  });

  it("quitter vers un élément hors de la grille masque la grille", () => {
    const { container } = renderCanvas([pw()]);
    const layer = () => (container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity;
    fireEvent.dragOver(gridEl(container));
    dragLeaveTo(gridEl(container), document.body);
    expect(layer()).toBe("0");
  });

  it("dragOver sur une case autorise le déplacement (dropEffect = move)", () => {
    const { container } = renderCanvas([]);
    const dt = dataTransfer("bio", "{}");
    const ev = fireEvent.dragOver(cells(container)[0], { dataTransfer: dt });
    expect(dt.dropEffect).toBe("move");
    expect(ev).toBe(false); // preventDefault appelé
  });

  it("déposer sur une case ajoute un widget 1x1 à cet index via une mise à jour fonctionnelle", () => {
    const { container } = renderCanvas([pw({ id: 1 })]);
    fireEvent.drop(cells(container)[7], { dataTransfer: dataTransfer("streams", '{"x":1}') });
    expect(h.setWidgets).toHaveBeenCalledTimes(1);
    const updater = h.setWidgets.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater([pw({ id: 1 })])).toEqual([
      pw({ id: 1 }),
      { id: 2, type: "streams", index: 7, w: 1, h: 1, settings: {} },
    ]);
  });

  it("l'id vaut max(ids) + 1 sur l'état le plus récent, sans Date.now()", () => {
    const { container } = renderCanvas([]);
    vi.spyOn(Date, "now").mockReturnValue(4242);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "{}") });
    const updater = h.setWidgets.mock.calls[0][0];
    expect(updater([pw({ id: 4, index: 5 }), pw({ id: 9, index: 6 })])[2].id).toBe(10);
    expect(updater([])[0].id).toBe(1);
    expect(updater([])[0].id).not.toBe(4242);
  });

  it("deux dépôts rapides produisent deux widgets aux ids distincts", () => {
    render(<Stateful initial={[]} />);
    const grid = document.querySelectorAll(".aspect-square");
    fireEvent.drop(grid[0], { dataTransfer: dataTransfer("bio", "") });
    fireEvent.drop(grid[1], { dataTransfer: dataTransfer("bio", "") });
    expect(latest.map((w) => w.id)).toEqual([1, 2]);
  });

  it("ne crée pas de widget fantôme pour un type vide", () => {
    const { container } = renderCanvas([]);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("", "{}") });
    expect(h.setWidgets).not.toHaveBeenCalled();
  });

  it.each(["inconnu", "top_inconnu", "profile"])("ne crée pas de widget pour le type inconnu %s", (type) => {
    const { container } = renderCanvas([]);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer(type, "{}") });
    expect(h.setWidgets).not.toHaveBeenCalled();
  });

  it("dépôt sur une cellule occupée accepté (règle changée : l'empilement est permis) : créé au-dessus de tous les autres", () => {
    render(<Stateful initial={[pw({ id: 1, index: 4 }), pw({ id: 2, index: 0 })]} />);
    fireEvent.drop(document.querySelectorAll(".aspect-square")[4], { dataTransfer: dataTransfer("bio", "") });
    expect(latest.map((w) => w.id)).toEqual([1, 2, 3]);
    expect(latest[2]).toMatchObject({ type: "bio", index: 4, w: 1, h: 1 });
  });

  it("dépôt sur une cellule couverte par un widget plus grand accepté, en fin de tableau", () => {
    render(<Stateful initial={[pw({ id: 1, index: 0, w: 2, h: 2 })]} />);
    fireEvent.drop(document.querySelectorAll(".aspect-square")[4], { dataTransfer: dataTransfer("bio", "") });
    expect(latest).toHaveLength(2);
    expect(latest[1]).toMatchObject({ id: 2, index: 4 });
  });

  it("déposer sur un widget (qui recouvre les cases) vise la case située sous le curseur", () => {
    const { container } = renderCanvas([pw({ id: 1, index: 0, w: 3, h: 5 })]);
    // grille mockée 300x500 : (150, 250) = colonne 1, ligne 2 = case 7
    // jsdom n'a pas de DragEvent : on pose les coordonnées à la main
    const ev = createEvent.drop(widgetBox(container), { dataTransfer: dataTransfer("bio", "") });
    Object.defineProperties(ev, { clientX: { value: 150 }, clientY: { value: 250 } });
    fireEvent(widgetBox(container), ev);
    const updater = h.setWidgets.mock.calls[0][0];
    expect(updater([pw({ id: 1, index: 0, w: 3, h: 5 })])[1]).toMatchObject({ type: "bio", index: 7 });
  });

  it("accepte un dépôt sur une cellule libre voisine", () => {
    render(<Stateful initial={[pw({ id: 1, index: 4 })]} />);
    fireEvent.drop(document.querySelectorAll(".aspect-square")[5], { dataTransfer: dataTransfer("bio", "") });
    expect(latest.map((w) => w.index)).toEqual([4, 5]);
  });

  it("rend la liste inchangée si le widget déposé sortirait de la grille", () => {
    const { container } = renderCanvas([]);
    fireEvent.drop(cells(container)[2], { dataTransfer: dataTransfer("period", "") }); // 2x1 à la colonne 3
    const updater = h.setWidgets.mock.calls[0][0];
    const prev = [pw({ id: 1, index: 0 })];
    expect(updater(prev)).toBe(prev);
  });

  it("déposer masque la grille", () => {
    const { container } = renderCanvas([pw()]);
    fireEvent.dragOver(gridEl(container));
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "{}") });
    expect((container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity).toBe("0");
  });

  it("dépôt sur la dernière case (14) et sur la première (0)", () => {
    const { container } = renderCanvas([]);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "{}") });
    fireEvent.drop(cells(container)[14], { dataTransfer: dataTransfer("bio", "{}") });
    expect(h.setWidgets.mock.calls[0][0]([])[0].index).toBe(0);
    expect(h.setWidgets.mock.calls[1][0]([])[0].index).toBe(14);
  });

  it("un dépôt avec widgetData vide ne doit pas lever d'exception", () => {
    const { container } = renderCanvas([]);
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => { errors.push(e.error); e.preventDefault(); };
    window.addEventListener("error", onError);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "") });
    window.removeEventListener("error", onError);
    expect(errors).toEqual([]);
    expect(h.setWidgets).toHaveBeenCalled();
  });
});

describe("ResumeCanvas – redimensionnement", () => {
  // Grille mockée 300x500 : cellules de 100x100
  const start = (pos: string, widget: Partial<PlacedWidget> = {}) => {
    const utils = render(<Stateful initial={[pw({ index: 4, ...widget })]} />);
    fireEvent.mouseDown(handle(utils.container, pos));
    return utils;
  };
  const move = (x: number, y: number) => fireEvent.mouseMove(window, { clientX: x, clientY: y });

  it("affiche 4 poignées pour le widget sélectionné seulement", () => {
    const { container } = renderCanvas([pw()]);
    expect(handle(container, "se")).not.toBeInTheDocument();
    cleanup();
    const sel = renderSelected([pw({ id: 1 }), pw({ id: 2, index: 1 })]);
    for (const p of ["nw", "ne", "sw", "se"]) expect(sel.container.querySelectorAll(`.cursor-${p}-resize`)).toHaveLength(1);
  });

  it("mouseDown sur une poignée ne sélectionne pas le widget", () => {
    start("se");
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("bottom-right agrandit vers la droite et le bas", () => {
    start("se");
    move(250, 350);
    expect(latest[0]).toMatchObject({ index: 4, w: 2, h: 3 });
  });

  it("bottom-right ne descend pas sous 1x1", () => {
    start("se");
    move(0, 0);
    expect(latest[0]).toMatchObject({ index: 4, w: 1, h: 1 });
  });

  it("bottom-right est borné à la grille (3 colonnes, 5 lignes)", () => {
    start("se");
    move(9999, 9999);
    expect(latest[0]).toMatchObject({ index: 4, w: 2, h: 4 });
  });

  it("top-left agrandit vers le haut et la gauche en déplaçant l'index", () => {
    start("nw");
    move(10, 10);
    expect(latest[0]).toMatchObject({ index: 0, w: 2, h: 2 });
  });

  it("top-left est borné à 0 pour des coordonnées négatives", () => {
    start("nw");
    move(-500, -500);
    expect(latest[0]).toMatchObject({ index: 0, w: 2, h: 2 });
  });

  it("top-left ne dépasse pas le coin opposé", () => {
    start("nw");
    move(9999, 9999);
    expect(latest[0]).toMatchObject({ index: 4, w: 1, h: 1 });
  });

  it("top-right modifie la ligne de début et la colonne de fin", () => {
    start("ne");
    move(290, 10);
    expect(latest[0]).toMatchObject({ index: 1, w: 2, h: 2 });
  });

  it("bottom-left modifie la colonne de début et la ligne de fin", () => {
    start("sw");
    move(10, 390);
    expect(latest[0]).toMatchObject({ index: 3, w: 2, h: 3 });
  });

  it("réduit un widget 2x2 via bottom-right", () => {
    start("se", { index: 0, w: 2, h: 2 });
    move(50, 50);
    expect(latest[0]).toMatchObject({ index: 0, w: 1, h: 1 });
  });

  it("n'appelle pas setWidgets si la taille ne change pas", () => {
    render(<ResumeCanvas range="y" resumeData={resumeData} widgets={[pw({ index: 4 })]} setWidgets={h.setWidgets} onSelectWidget={h.onSelect} selectedId={1} />);
    fireEvent.mouseDown(document.querySelector(".cursor-se-resize")!);
    fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
    expect(h.setWidgets).not.toHaveBeenCalled();
  });

  it("mouseUp arrête le redimensionnement", () => {
    start("se");
    fireEvent.mouseUp(window);
    move(250, 350);
    expect(latest[0]).toMatchObject({ w: 1, h: 1 });
  });

  it("sans mouseDown préalable, les mouvements sont ignorés", () => {
    render(<Stateful initial={[pw({ index: 4 })]} />);
    move(250, 350);
    expect(latest[0]).toMatchObject({ w: 1, h: 1 });
  });

  it("ignore le déplacement si le widget redimensionné a été supprimé", () => {
    const { container } = start("se");
    // le widget disparaît : la poignée aussi, mais l'état de redimensionnement subsiste
    fireEvent.click(screen.getByTitle("Supprimer le widget"));
    expect(container.querySelector(".pointer-events-auto")).not.toBeInTheDocument();
    expect(() => move(250, 350)).not.toThrow();
    expect(latest).toEqual([]);
  });

  it("retire les écouteurs window au démontage", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = start("se");
    unmount();
    expect(spy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("mouseup", expect.any(Function));
  });

  it("n'affecte que le widget redimensionné", () => {
    const utils = render(<Stateful initial={[pw({ id: 1, index: 0 }), pw({ id: 2, index: 14 })]} />);
    fireEvent.mouseDown(utils.container.querySelectorAll(".cursor-se-resize")[0]);
    move(150, 150);
    expect(latest.find((w) => w.id === 2)).toMatchObject({ index: 14, w: 1, h: 1 });
    expect(latest.find((w) => w.id === 1)).toMatchObject({ w: 2, h: 2 });
  });

  it("agrandissement par-dessus un autre widget accepté (règle changée : l'empilement est permis), ordre inchangé", () => {
    const utils = render(<Stateful initial={[pw({ id: 1, index: 0 }), pw({ id: 2, index: 1 })]} />);
    fireEvent.mouseDown(utils.container.querySelectorAll(".cursor-se-resize")[0]);
    move(150, 50); // 2x1 : recouvre le widget 2
    expect(latest.find((w) => w.id === 1)).toMatchObject({ index: 0, w: 2, h: 1 });
    expect(latest.map((w) => w.id)).toEqual([1, 2]);
  });

  it("agrandissement vers le haut/gauche par-dessus un autre widget accepté", () => {
    const utils = render(<Stateful initial={[pw({ id: 1, index: 4 }), pw({ id: 2, index: 3 })]} />);
    fireEvent.mouseDown(utils.container.querySelectorAll(".cursor-nw-resize")[0]);
    move(10, 150); // couvre la cellule 3
    expect(latest.find((w) => w.id === 1)).toMatchObject({ index: 3, w: 2, h: 1 });
  });

  it("l'updater de redimensionnement ne modifie que le widget visé, sur l'état le plus récent", () => {
    render(<ResumeCanvas range="y" resumeData={resumeData} widgets={[pw({ index: 0 })]} setWidgets={h.setWidgets} onSelectWidget={h.onSelect} selectedId={1} />);
    fireEvent.mouseDown(document.querySelector(".cursor-se-resize")!);
    move(150, 50);
    const updater = h.setWidgets.mock.calls[0][0];
    const prev = [pw({ id: 1, index: 0 }), pw({ id: 2, index: 1 })];
    const next = updater(prev);
    expect(next[0]).toMatchObject({ id: 1, w: 2 });
    expect(next[1]).toBe(prev[1]);
  });

  it("ne plante pas si la grille a une taille nulle", () => {
    (HTMLElement.prototype.getBoundingClientRect as any).mockReturnValue({ left: 0, top: 0, width: 0, height: 0 });
    start("se");
    expect(() => act(() => { move(10, 10); })).not.toThrow();
  });
});

describe("ResumeCanvas – éléments exclus de l'export image", () => {
  const ignored = (c: HTMLElement) => c.querySelectorAll('[data-export-ignore="true"]');

  it("marque le visuel de chaque case de la grille", () => {
    const { container } = renderCanvas([]);
    for (const cell of cells(container)) expect(cell.querySelector('[data-export-ignore="true"]')).toBeInTheDocument();
  });

  it("garde les cases elles-mêmes dans l'export (la mise en page ne s'effondre pas)", () => {
    const { container } = renderCanvas([]);
    for (const cell of cells(container)) expect(cell).not.toHaveAttribute("data-export-ignore");
  });

  it("marque le bouton de suppression et les 4 poignées", () => {
    renderSelected([pw()]);
    expect(screen.getByTitle("Supprimer le widget")).toHaveAttribute("data-export-ignore", "true");
    for (const p of ["nw", "ne", "sw", "se"]) {
      expect(document.querySelector(`.cursor-${p}-resize`)).toHaveAttribute("data-export-ignore", "true");
    }
  });

  it("marque l'anneau de sélection, qui n'existe que pour le widget sélectionné", async () => {
    const { container } = renderCanvas([pw()]);
    expect(container.querySelector(".ring-2")).not.toBeInTheDocument();
    await userEvent.click(widgetBox(container));
    expect(container.querySelector(".ring-2")).toHaveAttribute("data-export-ignore", "true");
  });

  it("ne marque pas le contenu des widgets ni le branding", () => {
    const { container } = renderCanvas([pw({ type: "bio" })]);
    expect(screen.getByTestId("w-bio").closest('[data-export-ignore="true"]')).toBeNull();
    expect(screen.getByText("Propulsé par MyStats").closest('[data-export-ignore="true"]')).toBeNull();
    expect(ignored(container).length).toBe(16);
  });
});


describe("ResumeCanvas – anglais", () => {
  it("traduit le branding et le bouton de suppression (la marque reste littérale)", () => {
    lang.current = "en";
    try {
      renderSelected([{ id: 1, type: "minutes", index: 0, w: 1, h: 1, settings: {} } as PlacedWidget]);
      expect(screen.getByText("Powered by MyStats")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete widget" })).toBeInTheDocument();
    } finally {
      lang.current = "fr";
    }
  });
});

describe("ResumeCanvas - déplacement", () => {
  // Grille simulée 300 x 500 : cases de 100 x 100, origine (0, 0)
  const mockGrid = (c: HTMLElement) => {
    gridEl(c).getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 500, right: 300, bottom: 500, x: 0, y: 0, toJSON: () => ({}) });
  };
  const setup = (widgets: PlacedWidget[], selected?: number | null) => {
    const utils = render(<Stateful initial={widgets} selected={selected} />);
    mockGrid(utils.container);
    const box = widgetBox(utils.container);
    box.setPointerCapture = vi.fn();
    box.releasePointerCapture = vi.fn();
    return { ...utils, box };
  };
  const ptr = (type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel", el: Element, x: number, y: number) =>
    fireEvent[type](el, { clientX: x, clientY: y, pointerId: 1, button: 0, isPrimary: true });

  beforeEach(() => { h.onSelect.mockClear(); latest = []; });

  it("déplace le widget en suivant le décalage de saisie et la grille", () => {
    const { box } = setup([pw({ w: 2, h: 1 })]);
    ptr("pointerDown", box, 150, 50); // case 1 : décalage de 1 colonne dans le widget
    ptr("pointerMove", box, 150, 250); // case (1,2) -> coin en (0,2)
    expect(latest[0].index).toBe(6);
    ptr("pointerMove", box, 250, 450); // case (2,4) -> coin (1,4)
    expect(latest[0].index).toBe(13);
    ptr("pointerUp", box, 250, 450);
    expect(latest[0].index).toBe(13);
    expect(latest[0].w).toBe(2);
    expect(box.setPointerCapture).toHaveBeenCalledWith(1);
    expect(h.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(screen.getByText(/déplacé, Case 13/)).toBeInTheDocument();
  });

  it("affiche la grille pendant le glisser et la masque ensuite", () => {
    const { box, container } = setup([pw()]);
    const grid = () => (container.querySelector('[data-grid="cells"]') as HTMLElement).style.opacity;
    ptr("pointerDown", box, 50, 50);
    ptr("pointerMove", box, 150, 50);
    expect(grid()).toBe("1");
    expect(box.className).toContain("cursor-grabbing");
    ptr("pointerUp", box, 150, 50);
    expect(grid()).toBe("0");
  });

  it("un clic sans mouvement sélectionne sans déplacer", () => {
    const { box } = setup([pw()], null);
    ptr("pointerDown", box, 50, 50);
    ptr("pointerMove", box, 52, 51);
    ptr("pointerUp", box, 52, 51);
    fireEvent.click(box);
    expect(latest[0]?.index ?? 0).toBe(0);
    expect(h.onSelect).toHaveBeenCalledTimes(1);
  });

  it("le clic qui suit un glisser ne re-sélectionne pas", () => {
    const { box } = setup([pw()], null);
    ptr("pointerDown", box, 50, 50);
    ptr("pointerMove", box, 150, 50);
    ptr("pointerUp", box, 150, 50);
    h.onSelect.mockClear();
    fireEvent.click(box);
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("Échap annule le glisser et restaure la position", async () => {
    const { box } = setup([pw({ index: 4 })]);
    ptr("pointerDown", box, 150, 150);
    ptr("pointerMove", box, 250, 450);
    expect(latest[0].index).toBe(14);
    h.onSelect.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(latest[0].index).toBe(4);
    expect(h.onSelect).not.toHaveBeenCalledWith(null); // pas de désélection
    ptr("pointerMove", box, 50, 50); // glisser terminé : ignoré
    expect(latest[0].index).toBe(4);
  });

  it("pointercancel restaure la position", () => {
    const { box } = setup([pw({ index: 4 })]);
    ptr("pointerDown", box, 150, 150);
    ptr("pointerMove", box, 250, 450);
    ptr("pointerCancel", box, 250, 450);
    expect(latest[0].index).toBe(4);
  });

  it("le glisser garde l'ordre d'empilement et autorise le chevauchement", () => {
    const { container } = setup([pw({ id: 1, index: 0 }), pw({ id: 2, index: 1 })]);
    const boxes = container.querySelectorAll<HTMLElement>(".pointer-events-auto.group");
    boxes[0].setPointerCapture = vi.fn();
    ptr("pointerDown", boxes[0], 50, 50);
    ptr("pointerMove", boxes[0], 150, 50);
    expect(latest.map(w => w.id)).toEqual([1, 2]);
    expect(latest[0].index).toBe(1);
  });

  it("une poignée de redimensionnement ne lance pas de glisser", () => {
    const { container } = setup([pw()]);
    const hd = handle(container, "se");
    ptr("pointerDown", hd, 50, 50);
    ptr("pointerMove", hd, 250, 450);
    expect(latest[0]?.index ?? 0).toBe(0);
  });

  it("flèches : déplace d'une case seulement si le focus est sur le widget", () => {
    const { box } = setup([pw({ index: 4 })]);
    fireEvent.keyDown(box, { key: "ArrowRight" });
    expect(latest[0].index).toBe(5);
    fireEvent.keyDown(box, { key: "ArrowRight" }); // bord droit : bloqué
    expect(latest[0].index).toBe(5);
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(latest[0].index).toBe(2);
    fireEvent.keyDown(box, { key: "ArrowLeft" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(latest[0].index).toBe(4);
    expect(screen.getByText(/déplacé, Case 4/)).toBeInTheDocument();
    const child = box.firstElementChild as HTMLElement;
    fireEvent.keyDown(child, { key: "ArrowRight" }); // cible différente du widget : ignoré
    expect(latest[0].index).toBe(4);
  });

  it("le widget est focalisable avec un libellé traduit et sa position", () => {
    const { box } = setup([pw({ index: 4 })]);
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box).toHaveAttribute("role", "group");
    expect(box.getAttribute("aria-label")).toMatch(/, Case 4$/);
  });

  it("l'annonce et la région live sont exclues de l'export", () => {
    const { container } = setup([pw()]);
    expect(container.querySelector('[aria-live="polite"]')).toHaveAttribute("data-export-ignore", "true");
  });
});
