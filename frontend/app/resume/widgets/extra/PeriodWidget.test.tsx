import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeriodSettings, PeriodWidget } from "./PeriodWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

describe("PeriodWidget", () => {
  it.each([[1, 1, "text-[11px]"], [2, 1, "text-xl"], [2, 2, "text-3xl"]])("%ix%i : libellé en taille %s", (w, h, cls) => {
    render(<PeriodWidget w={w} h={h} data="Été 2025" />);
    expect(screen.getByText("Été 2025")).toHaveClass(cls);
  });

  it("accepte une année numérique", () => {
    render(<PeriodWidget w={2} h={1} data={2026} />);
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("couleur et taille des réglages", () => {
    render(<PeriodWidget w={2} h={1} data="2026" settings={{ color: "#F87171", size: "lg" }} />);
    expect(screen.getByText("2026")).toHaveStyle({ color: "#F87171" });
    expect(screen.getByText("2026")).toHaveClass("text-3xl");
  });

  it.each([[undefined], [null], [""], ["  "]])("libellé absent (%s) : tiret", (data) => {
    render(<PeriodWidget w={2} h={1} data={data as never} />);
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("taille inconnue : repli sur moyen", () => {
    render(<PeriodWidget w={2} h={1} data="x" settings={{ size: "xxl" as never }} />);
    expect(screen.getByText("x")).toHaveClass("text-xl");
  });

  it("réglages : couleur et taille", async () => {
    const onChange = vi.fn();
    render(<PeriodSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Grand" }));
    expect(onChange).toHaveBeenLastCalledWith({ size: "lg" });
    await userEvent.click(screen.getAllByRole("button")[0]);
    expect(onChange).toHaveBeenLastCalledWith({ color: "#1DB954" });
  });
});
