/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TopFiveWidget } from "./TopFiveWidget";

const h = vi.hoisted(() => ({ real: false }));

// Par défaut, Widget est remplacé : on expose chaque layout par sa clé.
vi.mock("./Widget", async () => {
  const actual = await vi.importActual<typeof import("./Widget")>("./Widget");
  return {
    default: (p: any) =>
      h.real ? (
        actual.default(p)
      ) : (
        <div data-testid="widget" data-w={p.w} data-h={p.h}>
          {Object.entries(p.layouts).map(([k, v]) => (
            <section key={k} data-testid={`layout-${k}`}>{v as any}</section>
          ))}
        </div>
      ),
  };
});

const item = (n: number, over: Record<string, any> = {}) => ({
  name: `Item ${n}`, minutes: n, rating: n, streams: n * 1000, image: `img${n}.png`, ...over,
});
const five = [1, 2, 3, 4, 5].map((n) => item(n));
const layout = (k: string) => screen.getByTestId(`layout-${k}`);

beforeEach(() => {
  h.real = false;
});

describe("TopFiveWidget – structure", () => {
  it("transmet w et h à Widget", () => {
    render(<TopFiveWidget w={2} h={3} type="artists" data={five} />);
    expect(screen.getByTestId("widget")).toHaveAttribute("data-w", "2");
    expect(screen.getByTestId("widget")).toHaveAttribute("data-h", "3");
  });

  it("fournit les quatre layouts 1x1, 2x1, 1x3, 3x3", () => {
    render(<TopFiveWidget w={1} h={1} type="artists" data={five} />);
    for (const k of ["1x1", "2x1", "1x3", "3x3"]) expect(layout(k)).toBeInTheDocument();
  });

  it("les clés de layouts sont au format LayoutKey (ex. 1x1) pour être résolues par Widget", () => {
    // Widget choisit un layout via des clés `${w}x${h}` ; sinon il affiche le fallback vide.
    render(<TopFiveWidget w={1} h={1} type="artists" data={five} />);
    const keys = screen.getAllByTestId(/^layout-/).map((e) => e.dataset.testid!.replace("layout-", ""));
    for (const k of keys) expect(k).toMatch(/^\d+x\d+$/);
  });

  it("avec le vrai Widget, une taille 1x1 affiche le contenu du top (pas le fallback vide)", () => {
    h.real = true;
    render(<TopFiveWidget w={1} h={1} type="artists" data={five} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });
});

describe("TopFiveWidget – layout small", () => {
  it("affiche le nom et l'image du n°1", () => {
    render(<TopFiveWidget w={1} h={1} type="tracks" data={five} />);
    const l = within(layout("1x1"));
    expect(l.getByText("Item 1")).toBeInTheDocument();
    expect(l.getByAltText("Item 1")).toHaveAttribute("src", "img1.png");
  });

  it("n'affiche que le premier élément", () => {
    render(<TopFiveWidget w={1} h={1} type="tracks" data={five} />);
    expect(within(layout("1x1")).queryByText("Item 2")).not.toBeInTheDocument();
  });
});

describe("TopFiveWidget – layout horizontal", () => {
  it("affiche le n°1 puis les rangs 2 à 4", () => {
    render(<TopFiveWidget w={2} h={1} type="artists" data={five} />);
    const l = within(layout("2x1"));
    expect(l.getAllByText("Item 1")).not.toHaveLength(0);
    for (const n of [2, 3, 4]) {
      expect(l.getByText(`Item ${n}`)).toBeInTheDocument();
      expect(l.getByText(String(n))).toBeInTheDocument();
    }
    expect(l.queryByText("Item 5")).not.toBeInTheDocument();
  });

  it("chaque image a un texte alternatif égal au nom", () => {
    render(<TopFiveWidget w={2} h={1} type="artists" data={five} />);
    expect(within(layout("2x1")).getByAltText("Item 3")).toHaveAttribute("src", "img3.png");
  });

  it("ne plante pas avec deux éléments portant le même nom (clés React)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TopFiveWidget w={2} h={1} type="artists" data={[item(1), item(2, { name: "Dup" }), item(3, { name: "Dup" })]} />);
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("same key"), expect.anything());
    spy.mockRestore();
  });
});

describe("TopFiveWidget – layout vertical", () => {
  it("affiche le type en en-tête", () => {
    render(<TopFiveWidget w={1} h={3} type="albums" data={five} />);
    expect(within(layout("1x3")).getByText("albums")).toBeInTheDocument();
  });

  it("liste les 5 éléments numérotés de 1 à 5", () => {
    render(<TopFiveWidget w={1} h={3} type="albums" data={five} />);
    const l = within(layout("1x3"));
    for (let n = 1; n <= 5; n++) expect(l.getByText(String(n))).toBeInTheDocument();
    expect(layout("1x3").querySelectorAll("img")).toHaveLength(5);
  });

  it("images décoratives (alt vide)", () => {
    render(<TopFiveWidget w={1} h={3} type="albums" data={five} />);
    layout("1x3").querySelectorAll("img").forEach((i) => expect(i).toHaveAttribute("alt", ""));
  });

  it("artistes : images rondes ; autres types : images arrondies", () => {
    const { unmount } = render(<TopFiveWidget w={1} h={3} type="artists" data={five} />);
    expect(layout("1x3").querySelector("img")!.className).toContain("rounded-full");
    unmount();
    render(<TopFiveWidget w={1} h={3} type="tracks" data={five} />);
    const cls = layout("1x3").querySelector("img")!.className;
    expect(cls).toContain("rounded-md");
    expect(cls).not.toContain("rounded-full");
  });

  it("utilise une image de remplacement quand image est absente", () => {
    render(<TopFiveWidget w={1} h={3} type="tracks" data={[item(1, { image: undefined }), item(2, { image: "" })]} />);
    const imgs = layout("1x3").querySelectorAll("img");
    expect(imgs[0]).toHaveAttribute("src", "/api/placeholder/40/40");
    expect(imgs[1]).toHaveAttribute("src", "/api/placeholder/40/40");
  });

  it("affiche moins de 5 lignes si les données sont moins nombreuses", () => {
    render(<TopFiveWidget w={1} h={3} type="tracks" data={five.slice(0, 3)} />);
    expect(layout("1x3").querySelectorAll("img")).toHaveLength(3);
  });
});

describe("TopFiveWidget – layout large", () => {
  it("met en avant le n°1 avec son titre et l'image alternative", () => {
    render(<TopFiveWidget w={3} h={3} type="artists" data={five} />);
    const l = within(layout("3x3"));
    expect(l.getByText(/N°1 Incontesté artists/)).toBeInTheDocument();
    expect(l.getByRole("heading", { name: "Item 1" })).toBeInTheDocument();
    expect(l.getByAltText("Item 1")).toHaveAttribute("src", "img1.png");
  });

  it("affiche le nombre de streams formaté du n°1 pour un artiste", () => {
    render(<TopFiveWidget w={3} h={3} type="artists" data={[item(1, { streams: 1234567 })]} />);
    expect(within(layout("3x3")).getByText(`${(1234567).toLocaleString()} streams`)).toBeInTheDocument();
  });

  it("affiche les rangs 2 à 5 avec leurs streams", () => {
    render(<TopFiveWidget w={3} h={3} type="albums" data={five} />);
    const l = within(layout("3x3"));
    for (let n = 2; n <= 5; n++) {
      expect(l.getByText(`Item ${n}`)).toBeInTheDocument();
      expect(l.getByText(`${(n * 1000).toLocaleString()} streams`)).toBeInTheDocument();
    }
  });

  it("ignore les éléments au-delà du cinquième", () => {
    render(<TopFiveWidget w={3} h={3} type="albums" data={[...five, item(6)]} />);
    expect(screen.queryByText("Item 6")).not.toBeInTheDocument();
  });

  it("pour le type tracks, la ligne secondaire du n°1 ne répète pas le titre", () => {
    render(<TopFiveWidget w={3} h={3} type="tracks" data={five} />);
    expect(within(layout("3x3")).getAllByText("Item 1").length).toBe(1);
  });

  it("image de remplacement quand l'image est absente", () => {
    render(<TopFiveWidget w={3} h={3} type="albums" data={[item(1, { image: undefined }), item(2, { image: undefined })]} />);
    const srcs = Array.from(layout("3x3").querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).toContain("/api/placeholder/120/120");
    expect(srcs).toContain("/api/placeholder/40/40");
  });

  it("streams manquants : pas de crash", () => {
    expect(() =>
      render(<TopFiveWidget w={3} h={3} type="artists" data={[item(1, { streams: undefined }), item(2, { streams: undefined })]} />),
    ).not.toThrow();
  });
});

describe("TopFiveWidget – données absentes", () => {
  it("ne plante pas avec un tableau vide", () => {
    expect(() => render(<TopFiveWidget w={1} h={1} type="artists" data={[]} />)).not.toThrow();
  });

  it("ne plante pas avec data undefined", () => {
    expect(() => render(<TopFiveWidget w={1} h={1} type="artists" data={undefined as any} />)).not.toThrow();
  });

  it("fonctionne avec un seul élément", () => {
    render(<TopFiveWidget w={1} h={1} type="artists" data={[item(1)]} />);
    expect(within(layout("1x1")).getByText("Item 1")).toBeInTheDocument();
  });
});
