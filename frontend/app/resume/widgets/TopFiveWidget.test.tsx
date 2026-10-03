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
const fmt = (n: number) => `${n.toLocaleString("fr-FR")} streams`;

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
    rerender(<TopFiveWidget w={3} h={3} type="tracks" data={five} sort="minutes" />);
    expect(container.textContent).toContain("1 min");
    expect(container.textContent).not.toContain("streams");
    rerender(<TopFiveWidget w={3} h={3} type="tracks" data={five} sort="rating" />);
    expect(container.textContent).toContain("1.00");
    expect(container.textContent).toContain("5.00");
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
