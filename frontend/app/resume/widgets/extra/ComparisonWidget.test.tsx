import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComparisonSettings, ComparisonWidget, variationPercent } from "./ComparisonWidget";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

const data = { minutes: 150, previous_minutes: 100, streams: 40, previous_streams: 50 };
const norm = (s: string | null) => (s ?? "").replace(/[\u00a0\u202f]/g, " ").replace(/−/g, "-");

describe("variationPercent", () => {
  it("calcule la variation", () => {
    expect(variationPercent(150, 100)).toBe(50);
    expect(variationPercent(50, 100)).toBe(-50);
  });
  it.each([[1, null], [1, undefined], [1, 0], [null, 5], [NaN, 5], [5, Infinity], ["3", 2]])("%s vs %s : null", (c, p) => {
    expect(variationPercent(c, p)).toBeNull();
  });
});

describe("ComparisonWidget", () => {
  it.each([[1, 1], [2, 1], [2, 2]])("%ix%i : +50 % en hausse (vert, flèche haut) pour les minutes", (w, h) => {
    render(<ComparisonWidget w={w} h={h} data={data} />);
    const val = screen.getByText((_, el) => el?.tagName === "SPAN" && norm(el.textContent).includes("+50 %") && el.children.length <= 1);
    expect(val).toHaveStyle({ color: "#1DB954" });
    expect(screen.getByTestId("comparison-arrow")).toBeInTheDocument();
  });

  it("streams en baisse : rouge et signe moins", () => {
    render(<ComparisonWidget w={2} h={1} data={data} settings={{ metric: "streams" }} />);
    expect(screen.getByText((_, el) => norm(el?.textContent ?? "") === "-20 %" && el?.children.length === 0)).toHaveStyle({ color: "#F87171" });
    expect(screen.getByText("Streams vs préc.")).toBeInTheDocument();
  });

  it("variation arrondie à zéro : neutre", () => {
    render(<ComparisonWidget w={2} h={1} data={{ minutes: 1000, previous_minutes: 1001 }} />);
    expect(screen.getByText(/0 %/)).toHaveStyle({ color: "#9CA3AF" });
  });

  it.each([[{ minutes: 5, previous_minutes: null }], [{ minutes: 5, previous_minutes: 0 }], [{}], [null]])("période précédente inutilisable (%j) : tiret, pas de flèche, pas de NaN", (d) => {
    const { container } = render(<ComparisonWidget w={2} h={1} data={d as never} />);
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.queryByTestId("comparison-arrow")).toBeNull();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("libellé personnalisé et anglais", () => {
    lang.current = "en";
    const { rerender } = render(<ComparisonWidget w={2} h={1} data={data} />);
    expect(screen.getByText("Minutes vs prev.")).toBeInTheDocument();
    rerender(<ComparisonWidget w={2} h={1} data={data} settings={{ label: "Evolution" }} />);
    expect(screen.getByText("Evolution")).toBeInTheDocument();
    lang.current = "fr";
  });

  it("réglages : indicateur et libellé", async () => {
    const onChange = vi.fn();
    render(<ComparisonSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Streams" }));
    expect(onChange).toHaveBeenLastCalledWith({ metric: "streams" });
    await userEvent.type(screen.getByLabelText("Titre du widget"), "A");
    expect(onChange).toHaveBeenLastCalledWith({ label: "A" });
    expect(screen.getByRole("button", { name: "Minutes" })).toHaveAttribute("aria-pressed", "true");
  });
});
