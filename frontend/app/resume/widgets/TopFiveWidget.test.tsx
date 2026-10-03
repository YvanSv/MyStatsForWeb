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
    expect(screen.getByText(/^artistes$/i)).toBeInTheDocument();
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
  const LAYOUTS: [number, number][] = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [1, 3], [3, 3]];
  const LABELS = { streams: "Streams", minutes: "Temps d'écoute", rating: "Rating" } as const;
  const labelFor = (w: number, sort: "streams" | "minutes" | "rating") => (sort === "minutes" && w < 3 ? "Temps d'écoute (min)" : LABELS[sort]);
  const SORTS = ["streams", "minutes", "rating"] as const;
  const cases = LAYOUTS.flatMap(([w, h]) => SORTS.map((sort) => [w, h, sort] as const));

  it.each(cases)("%ix%i, tri %s : pastille du critère et valeurs rendues", (w, h, sort) => {
    const { container } = render(<TopFiveWidget w={w} h={h} type="tracks" data={five} sort={sort} />);
    expect(screen.getAllByText(labelFor(w, sort)).length).toBeGreaterThan(0);
    const text = container.textContent!;
    // Le n°1 a toujours une valeur ; les listes en ont une par élément
    const full = w === 3; // 3x2 et 3x3 : nombres complets ; autres : abrégés
    const val = (n: number) => ({ streams: full ? (n * 1000).toLocaleString("fr-FR") : `${n}.0k`, minutes: full ? `${n} min` : `${n}`, rating: `${n}.00` }[sort]);
    expect(text).toContain(val(1));
    if (!(w === 1 && h === 1)) expect(text).toContain(val(3));
    if (sort === "minutes" && !full) expect(text).not.toMatch(/\d min/);
    if (sort === "streams") expect(text).not.toMatch(/streams/);
    expect(text).not.toMatch(/NaN|undefined/);
  });

  it("listes : valeur alignée à droite en chiffres tabulaires ; « min » seulement pour le temps d'écoute", () => {
    render(<TopFiveWidget w={3} h={2} type="tracks" data={five} sort="minutes" />);
    const v = screen.getByText("3 min");
    expect(v.className).toContain("tabular-nums");
    expect(v.className).toContain("text-right");
    expect(v.className).not.toContain("truncate");
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
      const grid = container.querySelector('[class*="max-content"]')!;
      expect(grid).not.toBeNull();
      expect(grid.children).toHaveLength(3);
      expect(grid.children[1].textContent).toMatch(/albums/);
      expect(grid.children[1].className).toContain("text-center");
      expect(grid.children[2].className).toContain("justify-self-end");
      expect(grid.children[2].textContent).toBe("Rating");
      unmount();
    }
  });

  // jsdom ne mesure aucune largeur : structure (classes) seulement. À vérifier dans le navigateur :
  // pastille complète en 3x3/3x2/2x2 (fr et en), titre non recouvert, nom du n°1 sur 2 lignes sans débordement en 3x3.
  it.each([[3, 3], [3, 2], [2, 2]])("%ix%i : pastille du critère jamais tronquée", (w, h) => {
    render(<TopFiveWidget w={w} h={h} type="albums" data={five} sort="minutes" />);
    const pill = screen.getAllByText(w === 3 ? "Temps d'écoute" : "Temps d'écoute (min)")[0];
    expect(pill.className).toContain("whitespace-nowrap");
    expect(pill.className).not.toContain("truncate");
    expect(pill.className).not.toMatch(/max-w/);
    expect(pill.parentElement!.className).not.toContain("max-w-full");
  });

  it("1x3 : pastille encore tronquable (très étroit)", () => {
    render(<TopFiveWidget w={1} h={3} type="albums" data={five} sort="minutes" />);
    expect(screen.getAllByText("Temps d'écoute (min)")[0].className).toContain("truncate");
  });

  it("3x3 : nom du n°1 sur 2 lignes (line-clamp-2, sans truncate), noms des rangs 2 à 5 sur une ligne", () => {
    render(<TopFiveWidget w={3} h={3} type="tracks" data={five} />);
    const h3 = screen.getByRole("heading", { name: "Item 1" });
    expect(h3.className).toContain("line-clamp-2");
    expect(h3.className).toContain("break-words");
    expect(h3.className).toContain("text-center");
    expect(h3.className).not.toContain("truncate");
    for (let n = 2; n <= 5; n++) expect(screen.getByText(`Item ${n}`).className).toContain("truncate");
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

describe("TopFiveWidget : valeur jamais tronquée (1x1, 2x1, 1x2)", () => {
  // jsdom ne mesure aucune largeur : on vérifie la structure (classes), pas le rendu réel.
  const big = [1, 2, 3, 4].map((n) => item(n, { streams: 3100 * n, minutes: 3100 * n }));
  const noTrunc = (el: HTMLElement) => {
    expect(el.className).not.toContain("truncate");
    expect(el.className).not.toMatch(/max-w/);
    expect(el.className).toContain("shrink-0");
    expect(el.textContent).not.toContain("…");
  };

  it.each([[1, 1], [2, 1], [1, 2]])("%ix%i : valeur complète sans truncate/max-w, sans unité collée", (w, h) => {
    render(<TopFiveWidget w={w} h={h} type="tracks" data={big} sort="minutes" />);
    const v = screen.getAllByText("3.1k")[0];
    noTrunc(v);
    expect(screen.getAllByText("Temps d'écoute (min)").length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d min/)).toBeNull();
  });

  it.each([[1, 1], [2, 1], [1, 2]])("%ix%i : le nom se tronque", (w, h) => {
    render(<TopFiveWidget w={w} h={h} type="tracks" data={big} />);
    const name = screen.getAllByText("Item 1")[0];
    expect(name.className).toContain("truncate");
    if (w !== 1 || h !== 1) expect(name.className).toContain("min-w-0");
  });

  it.each([[2, 2], [3, 2], [1, 3]])("%ix%i : valeur prioritaire, nom tronquable", (w, h) => {
    render(<TopFiveWidget w={w} h={h} type="tracks" data={big} />);
    noTrunc(screen.getAllByText(w === 3 ? fmt(3100).replace(/\s/g, " ") : "3.1k")[0].closest("span")!);
    expect(screen.getByText("Item 1").className).toMatch(/min-w-0/);
  });

  it("1x2 : titre à gauche, critère dessous, 3 lignes avec valeurs", () => {
    const { container } = render(<TopFiveWidget w={1} h={2} type="albums" data={big} sort="rating" />);
    const title = screen.getByText("albums");
    expect(title.className).toContain("text-left");
    expect(title.className).not.toContain("text-center");
    expect(title.parentElement!.className).toContain("items-start");
    expect(title.parentElement!.textContent).toContain("Rating");
    for (const n of [1, 2, 3]) expect(screen.getByText(`Item ${n}`)).toBeInTheDocument();
    expect(screen.queryByText("Item 4")).toBeNull();
    for (const n of [1, 2, 3]) expect(screen.getByText(`${n}.00`)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  it("1x2 : valeurs invalides -> tiret", () => {
    const { container } = render(<TopFiveWidget w={1} h={2} type="tracks" data={[item(1, { streams: NaN }), item(2, { streams: undefined })]} />);
    expect(container.textContent).toContain("–");
    expect(container.textContent).not.toMatch(/NaN|undefined/);
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
