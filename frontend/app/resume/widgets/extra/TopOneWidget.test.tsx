import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopOneSettings, TopOneWidget } from "./TopOneWidget";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

const it1 = (name: string, over = {}) => ({ name, minutes: 1, rating: 1, streams: 1234, image: `${name}.png`, ...over });
const data = { tracks: it1("Titre A"), albums: it1("Album B"), artists: it1("Artiste C") };

describe("TopOneWidget", () => {
  it.each([[1, 1], [2, 1], [2, 2]])("%ix%i : nom, image et streams du titre n°1 par défaut", (w, h) => {
    const { container } = render(<TopOneWidget w={w} h={h} data={data} />);
    expect(screen.getByText("Titre A")).toBeInTheDocument();
    expect(screen.getByText(/1[  ]234 streams/)).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "Titre A.png");
  });

  it.each([["albums", "Album B", "Album n°1"], ["artists", "Artiste C", "Artiste n°1"]] as const)("entité %s", (entity, name, heading) => {
    render(<TopOneWidget w={2} h={1} data={data} settings={{ entity }} />);
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
  });

  it("artistes : image ronde", () => {
    const { container } = render(<TopOneWidget w={2} h={1} data={data} settings={{ entity: "artists" }} />);
    expect(container.querySelector("img")!.className).toContain("rounded-full");
  });

  it("entité inconnue : repli sur les titres", () => {
    render(<TopOneWidget w={2} h={1} data={data} settings={{ entity: "x" as never }} />);
    expect(screen.getByText("Titre A")).toBeInTheDocument();
  });

  it("textes en anglais", () => {
    lang.current = "en";
    render(<TopOneWidget w={2} h={1} data={data} />);
    expect(screen.getByText("Track #1")).toBeInTheDocument();
    lang.current = "fr";
  });

  it("élément absent : tiret, sans NaN ni undefined", () => {
    const { container } = render(<TopOneWidget w={2} h={1} data={{}} />);
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("données nulles : sans erreur", () => {
    expect(() => render(<TopOneWidget w={1} h={1} data={null as never} />)).not.toThrow();
  });

  it("sans image ni streams : pastille et pas de ligne streams", () => {
    const { container } = render(<TopOneWidget w={2} h={1} data={{ tracks: it1("Zed", { image: undefined, streams: undefined }) }} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/streams/)).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("réglages : entité et couleur", async () => {
    const onChange = vi.fn();
    render(<TopOneSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Albums" }));
    expect(onChange).toHaveBeenLastCalledWith({ color: "#fff", entity: "albums" });
    expect(screen.getByRole("button", { name: "Titres" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getAllByRole("button")[4]);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ color: "#FFFFFF" }));
  });
});
