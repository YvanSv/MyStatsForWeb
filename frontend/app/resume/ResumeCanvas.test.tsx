/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResumeCanvas from "./ResumeCanvas";
import type { PlacedWidget } from "./interfaces";

// --- Mocks : chaque widget expose ses props -----------------------------------
const stub = vi.hoisted(() => async (name: string, key: string) => {
  const { createElement } = await import("react");
  return {
    [name]: (p: any) =>
      createElement(
        "div",
        { "data-testid": `w-${key}`, "data-w": p.w, "data-h": p.h },
        JSON.stringify({ ...p, w: undefined, h: undefined }),
      ),
  };
});
vi.mock("./widgets/ProfileWidgets", () => ({ ProfileWidget: () => null }));
vi.mock("./widgets/TopFiveWidget", () => ({ TopFiveWidget: () => null }));
vi.mock("./widgets/atomic/ProfilePictureWidget", async () => await stub("ProfilePictureWidget", "profile_picture"));
vi.mock("./widgets/atomic/UsernameWidget", async () => await stub("UsernameWidget", "username"));
vi.mock("./widgets/atomic/BackgroundWidget", async () => await stub("BackgroundWidget", "background"));
vi.mock("./widgets/atomic/BioWidget", async () => await stub("BioWidget", "bio"));
vi.mock("./widgets/stats/MinutesWidget", async () => await stub("MinutesWidget", "minutes"));
vi.mock("./widgets/stats/StreamsWidget", async () => await stub("StreamsWidget", "streams"));
vi.mock("./widgets/stats/DistinctTracksWidget", async () => await stub("DistinctTracksWidget", "nb_tracks"));
vi.mock("./widgets/stats/DistinctAlbumsWidget", async () => await stub("DistinctAlbumsWidget", "nb_albums"));
vi.mock("./widgets/stats/DistinctArtistsWidget", async () => await stub("DistinctArtistsWidget", "nb_artists"));

// --- Helpers ----------------------------------------------------------------
const resumeData = {
  user: { display_name: "Yvan", bio: "Ma bio", banner: "b.png", avatar: "a.png" },
  minutes: 1234, streams: 567, distinct_tracks: 11, distinct_albums: 22, distinct_artists: 33,
};

const pw = (over: Partial<PlacedWidget> = {}): PlacedWidget => ({
  id: 1, type: "username", index: 0, w: 1, h: 1, settings: { color: "red" }, ...over,
});

const h = vi.hoisted(() => ({ onSelect: vi.fn(), setWidgets: vi.fn() }));

const renderCanvas = (widgets: PlacedWidget[], data: any = resumeData, range: string | number = "2025") =>
  render(
    <ResumeCanvas range={range} resumeData={data} widgets={widgets} setWidgets={h.setWidgets} onSelectWidget={h.onSelect} />,
  );

// Version avec état réel pour les redimensionnements et suppressions
let latest: PlacedWidget[] = [];
function Stateful({ initial }: { initial: PlacedWidget[] }) {
  const [widgets, setWidgets] = useState(initial);
  useEffect(() => { latest = widgets; }, [widgets]);
  return <ResumeCanvas range="y" resumeData={resumeData} widgets={widgets} setWidgets={setWidgets} onSelectWidget={h.onSelect} />;
}

const gridEl = (c: HTMLElement) => c.querySelector(".relative.p-2") as HTMLElement;
const cells = (c: HTMLElement) => c.querySelectorAll(".aspect-square");
const widgetBox = (c: HTMLElement) => c.querySelector(".pointer-events-auto") as HTMLElement;
const handle = (c: HTMLElement, pos: string) => c.querySelector(`.cursor-${pos}-resize`) as HTMLElement;

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
    expect(screen.getByText("POWERED BY MyStats")).toBeInTheDocument();
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
    expect((container.querySelector(".grid-cols-3") as HTMLElement).style.opacity).toBe("1");
  });

  it("masque la grille quand des widgets sont placés", () => {
    const { container } = renderCanvas([pw()]);
    expect((container.querySelector(".grid-cols-3") as HTMLElement).style.opacity).toBe("0");
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

describe("ResumeCanvas – sélection", () => {
  it("cliquer un widget le sélectionne et notifie le parent", async () => {
    const { container } = renderCanvas([pw({ id: 7, type: "bio", settings: { s: 1 } })]);
    await userEvent.click(widgetBox(container));
    expect(h.onSelect).toHaveBeenCalledWith({ id: 7, type: "bio", settings: { s: 1 } });
    expect(widgetBox(container).className).toContain("ring-2");
  });

  it("un widget non sélectionné n'a pas d'anneau", () => {
    const { container } = renderCanvas([pw()]);
    expect(widgetBox(container).className).not.toContain("ring-2");
  });

  it("sélectionner un autre widget déplace la sélection", async () => {
    const { container } = renderCanvas([pw({ id: 1 }), pw({ id: 2, index: 1 })]);
    const boxes = container.querySelectorAll(".pointer-events-auto");
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    expect(boxes[0].className).not.toContain("ring-2");
    expect(boxes[1].className).toContain("ring-2");
    expect(h.onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("cliquer sur le fond de la zone désélectionne", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    fireEvent.click(gridEl(container));
    expect(h.onSelect).toHaveBeenCalledWith(null);
    expect(widgetBox(container).className).not.toContain("ring-2");
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
    expect(widgetBox(container).className).not.toContain("ring-2");
  });

  it("les autres touches ne désélectionnent pas", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    await userEvent.keyboard("a{Enter}");
    expect(h.onSelect).not.toHaveBeenCalled();
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
  it("le bouton supprimer a un titre accessible", () => {
    renderCanvas([pw()]);
    expect(screen.getByRole("button", { name: "Supprimer le widget" })).toBeInTheDocument();
  });

  it("supprime le widget ciblé uniquement", async () => {
    render(<Stateful initial={[pw({ id: 1 }), pw({ id: 2, index: 1 })]} />);
    await userEvent.click(screen.getAllByTitle("Supprimer le widget")[0]);
    expect(latest.map((w) => w.id)).toEqual([2]);
  });

  it("n'appelle pas la sélection quand on supprime (stopPropagation)", async () => {
    renderCanvas([pw()]);
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("supprimer le widget sélectionné vide les propriétés du parent", async () => {
    const { container } = renderCanvas([pw()]);
    await userEvent.click(widgetBox(container));
    h.onSelect.mockClear();
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    expect(h.onSelect).toHaveBeenCalledWith(null);
  });

  it("supprimer un widget non sélectionné ne touche pas la sélection", async () => {
    const { container } = renderCanvas([pw({ id: 1 }), pw({ id: 2, index: 1 })]);
    await userEvent.click(container.querySelectorAll(".pointer-events-auto")[0]);
    h.onSelect.mockClear();
    await userEvent.click(screen.getAllByTitle("Supprimer le widget")[1]);
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it("setWidgets reçoit un updater qui filtre par id", async () => {
    renderCanvas([pw({ id: 5 })]);
    await userEvent.click(screen.getByTitle("Supprimer le widget"));
    const updater = h.setWidgets.mock.calls[0][0];
    expect(updater([pw({ id: 5 }), pw({ id: 6 })])).toEqual([pw({ id: 6 })]);
    expect(updater([])).toEqual([]);
  });
});

describe("ResumeCanvas – glisser-déposer", () => {
  it("survoler la zone affiche la grille, quitter la masque", () => {
    const { container } = renderCanvas([pw()]);
    const layer = () => (container.querySelector(".grid-cols-3") as HTMLElement).style.opacity;
    fireEvent.dragOver(gridEl(container));
    expect(layer()).toBe("1");
    fireEvent.dragLeave(gridEl(container));
    expect(layer()).toBe("0");
  });

  it("dragOver sur une case autorise le déplacement (dropEffect = move)", () => {
    const { container } = renderCanvas([]);
    const dt = dataTransfer("bio", "{}");
    const ev = fireEvent.dragOver(cells(container)[0], { dataTransfer: dt });
    expect(dt.dropEffect).toBe("move");
    expect(ev).toBe(false); // preventDefault appelé
  });

  it("déposer sur une case ajoute un widget 1x1 à cet index", () => {
    vi.spyOn(Date, "now").mockReturnValue(4242);
    const { container } = renderCanvas([pw({ id: 1 })]);
    fireEvent.drop(cells(container)[7], { dataTransfer: dataTransfer("streams", '{"x":1}') });
    expect(h.setWidgets).toHaveBeenCalledWith([
      pw({ id: 1 }),
      { id: 4242, type: "streams", index: 7, w: 1, h: 1, settings: {} },
    ]);
  });

  it("déposer masque la grille", () => {
    const { container } = renderCanvas([pw()]);
    fireEvent.dragOver(gridEl(container));
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "{}") });
    expect((container.querySelector(".grid-cols-3") as HTMLElement).style.opacity).toBe("0");
  });

  it("dépôt sur la dernière case (14) et sur la première (0)", () => {
    const { container } = renderCanvas([]);
    fireEvent.drop(cells(container)[0], { dataTransfer: dataTransfer("bio", "{}") });
    fireEvent.drop(cells(container)[14], { dataTransfer: dataTransfer("bio", "{}") });
    expect(h.setWidgets.mock.calls[0][0][0].index).toBe(0);
    expect(h.setWidgets.mock.calls[1][0][0].index).toBe(14);
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

  it("affiche 4 poignées par widget", () => {
    const { container } = renderCanvas([pw()]);
    for (const p of ["nw", "ne", "sw", "se"]) expect(handle(container, p)).toBeInTheDocument();
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
    render(<ResumeCanvas range="y" resumeData={resumeData} widgets={[pw({ index: 4 })]} setWidgets={h.setWidgets} onSelectWidget={h.onSelect} />);
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

  it("ne plante pas si la grille a une taille nulle", () => {
    (HTMLElement.prototype.getBoundingClientRect as any).mockReturnValue({ left: 0, top: 0, width: 0, height: 0 });
    start("se");
    expect(() => act(() => { move(10, 10); })).not.toThrow();
  });
});
