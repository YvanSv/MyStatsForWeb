/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopFiveSettings, TopFiveWidget, pickTopFive } from "./TopFiveWidget";

vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const item = (n: number, over: Record<string, any> = {}) => ({ name: `Item ${n}`, minutes: n, rating: n, streams: n * 1000, image: `img${n}.png`, ...over });
const five = [1, 2, 3, 4, 5].map((n) => item(n));
const fmt = (n: number) => n.toLocaleString("fr-FR");

describe("TopFiveWidget", () => {
  it("1x1 : nom et image du n°1 seulement", () => {
    const { container } = render(<TopFiveWidget w={1} h={1} type="tracks" data={five} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 2")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "img1.png");
  });

  it("2x1 : n°1 puis rangs 2 à 4", () => {
    render(<TopFiveWidget w={2} h={1} type="artists" data={five} />);
    for (const n of [1, 2, 3, 4]) expect(screen.getByText(`Item ${n}`)).toBeInTheDocument();
    expect(screen.queryByText("Item 5")).toBeNull();
  });

  it.each([[2, 2], [3, 2], [1, 3]])("%ix%i : liste numérotée des 5 éléments avec le type en en-tête", (w, h) => {
    render(<TopFiveWidget w={w} h={h} type="albums" data={five} />);
    expect(screen.getByText("albums")).toBeInTheDocument();
    for (let n = 1; n <= 5; n++) {
      expect(screen.getByText(`Item ${n}`)).toBeInTheDocument();
      expect(screen.getByText(String(n))).toBeInTheDocument();
    }
  });

  it("3x3 : n°1 en avant, streams formatés, rangs 2 à 5, rien au-delà", () => {
    render(<TopFiveWidget w={3} h={3} type="artists" data={[...five, item(6)]} />);
    expect(screen.getByText(/N°1 Incontesté artistes/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Item 1" })).toBeInTheDocument();
    for (let n = 1; n <= 5; n++) expect(screen.getByText(fmt(n * 1000).replace(/\s/g, " "))).toBeInTheDocument();
    expect(screen.queryByText("Item 6")).toBeNull();
  });

  it("images : décoratives (alt vide), rondes pour les artistes, arrondies sinon", () => {
    const { container, unmount } = render(<TopFiveWidget w={2} h={2} type="artists" data={five} />);
    container.querySelectorAll("img").forEach((i) => { expect(i).toHaveAttribute("alt", ""); expect(i.className).toContain("rounded-full"); });
    unmount();
    const r = render(<TopFiveWidget w={2} h={2} type="tracks" data={five} />);
    expect(r.container.querySelector("img")!.className).toContain("rounded-md");
  });

  it("image absente : pastille avec l'initiale, jamais d'adresse factice ni de src vide", () => {
    const { container } = render(<TopFiveWidget w={2} h={2} type="tracks" data={[item(1, { image: undefined }), item(2, { image: "" })]} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.innerHTML).not.toContain("placeholder");
    expect(screen.getAllByText("I")).toHaveLength(2);
  });

  it("streams manquants ou invalides : rien d'affiché (pas de NaN / undefined)", () => {
    const { container } = render(<TopFiveWidget w={3} h={3} type="artists" data={[item(1, { streams: undefined }), item(2, { streams: NaN })]} />);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("couleur d'accent des réglages", () => {
    render(<TopFiveWidget w={2} h={2} type="albums" data={five} settings={{ color: "#F87171" }} />);
    expect(screen.getByText("albums")).toHaveStyle({ color: "#F87171" });
  });

  it("deux éléments de même nom : pas d'avertissement de clé", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TopFiveWidget w={2} h={1} type="artists" data={[item(1), item(2, { name: "Dup" }), item(3, { name: "Dup" })]} />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it.each([[[]], [undefined], [null]])("données absentes (%s) : rendu vide sans erreur", (data) => {
    const { container } = render(<TopFiveWidget w={2} h={2} type="artists" data={data as any} />);
    expect(container.textContent).toBe("");
  });

  it("réglages : choisir une couleur", async () => {
    const onChange = vi.fn();
    render(<TopFiveSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole("button")[7]);
    expect(onChange).toHaveBeenCalledWith({ color: "#FFFFFF" });
  });

  it("réglages : choisir l'élément conserve la couleur", async () => {
    const onChange = vi.fn();
    render(<TopFiveSettings settings={{ color: "#F87171" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Albums" }));
    expect(onChange).toHaveBeenCalledWith({ color: "#F87171", entity: "albums" });
  });

  it("réglages : choisir le tri (défaut streams, couleur conservée)", async () => {
    const onChange = vi.fn();
    render(<TopFiveSettings settings={{ color: "#F87171" }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Streams" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Temps d'écoute" }));
    expect(onChange).toHaveBeenCalledWith({ color: "#F87171", sort: "minutes" });
    await userEvent.click(screen.getByRole("button", { name: "Rating" }));
    expect(onChange).toHaveBeenLastCalledWith({ color: "#F87171", sort: "rating" });
  });

  it("3x3 : le critère affiché suit le tri", () => {
    const { container, rerender } = render(<TopFiveWidget w={3} h={3} type="tracks" data={five} />);
    expect(container.textContent).toContain(fmt(1000));
    expect(container.textContent).not.toContain("1 000 streams");
    rerender(<TopFiveWidget w={3} h={3} type="tracks" data={five} sort="minutes" />);
    expect(container.textContent).toContain("1 min");
    rerender(<TopFiveWidget w={3} h={3} type="tracks" data={five} sort="rating" />);
    expect(container.textContent).toContain("1.00");
    expect(container.textContent).toContain("5.00");
  });
});

describe("TopFiveWidget : critère et valeurs par layout", () => {
  const LAYOUTS: [number, number][] = [[1, 1], [2, 1], [2, 2], [3, 2], [1, 3], [3, 3]];
  const LABELS = { streams: "Streams", minutes: "Temps d'écoute", rating: "Rating" } as const;
  const SORTS = ["streams", "minutes", "rating"] as const;
  const cases = LAYOUTS.flatMap(([w, h]) => SORTS.map((sort) => [w, h, sort] as const));

  it.each(cases)("%ix%i, tri %s : pastille du critère et valeurs rendues", (w, h, sort) => {
    const { container } = render(<TopFiveWidget w={w} h={h} type="tracks" data={five} sort={sort} />);
    expect(screen.getAllByText(LABELS[sort]).length).toBeGreaterThan(0);
    const text = container.textContent!;
    // Le n°1 a toujours une valeur ; les listes en ont une par élément
    const full = w === 3; // 3x2 et 3x3 : nombres complets ; autres : abrégés
    const val = (n: number) => ({ streams: full ? (n * 1000).toLocaleString("fr-FR") : `${n}.0k`, minutes: `${n} min`, rating: `${n}.00` }[sort]);
    expect(text).toContain(val(1));
    if (!(w === 1 && h === 1)) expect(text).toContain(val(3));
    if (sort === "streams") expect(text).not.toMatch(/streams/);
    expect(text).not.toMatch(/NaN|undefined/);
  });

  it("listes : valeur alignée à droite en chiffres tabulaires ; « min » seulement pour le temps d'écoute", () => {
    render(<TopFiveWidget w={3} h={2} type="tracks" data={five} sort="minutes" />);
    const v = screen.getByText("3 min");
    expect(v.className).toContain("tabular-nums");
    expect(v.className).toContain("text-right");
    expect(v.className).toContain("truncate");
    render(<TopFiveWidget w={3} h={2} type="tracks" data={five} sort="streams" />);
    expect(screen.queryByText(/streams$/)).toBeNull();
  });

  it("liste étroite : nombres abrégés, liste large : nombres complets", () => {
    const big = [item(1, { streams: 1234567 }), item(2, { streams: 2500 })];
    const { container, unmount } = render(<TopFiveWidget w={1} h={3} type="tracks" data={big} />);
    expect(container.textContent).toContain("1.2M");
    expect(container.textContent).toContain("2.5k");
    unmount();
    const r = render(<TopFiveWidget w={3} h={2} type="tracks" data={big} />);
    expect(r.container.textContent).toContain((1234567).toLocaleString("fr-FR"));
  });

  it("en-tête : titre centré au milieu, critère à droite (3 zones)", () => {
    for (const [w, h] of [[2, 1], [2, 2], [3, 2], [1, 3], [3, 3]]) {
      const { container, unmount } = render(<TopFiveWidget w={w} h={h} type="albums" data={five} sort="rating" />);
      const grid = container.querySelector(".grid-cols-\\[1fr_auto_1fr\\]")!;
      expect(grid).not.toBeNull();
      expect(grid.children).toHaveLength(3);
      expect(grid.children[1].textContent).toMatch(/albums/);
      expect(grid.children[1].className).toContain("text-center");
      expect(grid.children[2].className).toContain("justify-self-end");
      expect(grid.children[2].textContent).toBe("Rating");
      unmount();
    }
  });

  it("note colorée selon le seuil", () => {
    render(<TopFiveWidget w={2} h={2} type="tracks" data={[item(1, { rating: 9 }), item(2, { rating: 0.5 })]} sort="rating" />);
    expect(screen.getByText("9.00").className).toContain("text2");
    expect(screen.getByText("0.50").className).toContain("text-rouge");
  });

  it.each(LAYOUTS)("%ix%i : valeur absente ou invalide -> tiret, jamais NaN/undefined", (w, h) => {
    for (const sort of SORTS) {
      const bad = [item(1, { streams: NaN, minutes: undefined, rating: null }), item(2, { streams: Infinity, minutes: "x", rating: NaN }), item(3, { streams: undefined, minutes: NaN, rating: undefined })];
      const { container, unmount } = render(<TopFiveWidget w={w} h={h} type="tracks" data={bad} sort={sort} />);
      expect(container.textContent).toContain("–");
      expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|null/);
      unmount();
    }
  });
});

describe("pickTopFive", () => {
  const mk = (p: string) => [item(1, { name: `${p}1` })];
  const base = { tracks: mk("T"), albums: mk("A"), artists: mk("R") };
  const bySort = { tracks: { streams: mk("TS"), minutes: mk("TM"), rating: mk("TR") }, albums: { minutes: mk("AM") } };
  const names = (l: any[]) => l.map((i) => i.name);

  it("chaque tri choisit la bonne liste", () => {
    const d = { ...base, bySort };
    expect(names(pickTopFive(d, "tracks", "streams"))).toEqual(["TS1"]);
    expect(names(pickTopFive(d, "tracks", "minutes"))).toEqual(["TM1"]);
    expect(names(pickTopFive(d, "tracks", "rating"))).toEqual(["TR1"]);
    expect(names(pickTopFive(d, "albums", "minutes"))).toEqual(["AM1"]);
  });

  it("repli sans tops_by_sort : streams = topX, minutes/rating = vide", () => {
    expect(names(pickTopFive(base, "artists", "streams"))).toEqual(["R1"]);
    expect(pickTopFive(base, "artists", "minutes")).toEqual([]);
    expect(pickTopFive(base, "artists", "rating")).toEqual([]);
  });

  it("repli quand la liste du tri est vide", () => {
    const d = { ...base, bySort: { tracks: { streams: [], minutes: [] } } };
    expect(names(pickTopFive(d, "tracks", "streams"))).toEqual(["T1"]);
    expect(pickTopFive(d, "tracks", "minutes")).toEqual([]);
  });
});
