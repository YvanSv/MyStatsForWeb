import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreakSettings, StreakWidget } from "./StreakWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const data = { longest_streak_days: 42, current_streak_days: 7 };

describe("StreakWidget", () => {
  it.each([[1, 1], [2, 1], [2, 2]])("%ix%i : plus longue série et libellé record", (w, h) => {
    render(<StreakWidget w={w} h={h} data={data} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Série record (jours)")).toBeInTheDocument();
  });

  it("showCurrent : série en cours", () => {
    render(<StreakWidget w={1} h={1} data={data} settings={{ showCurrent: true }} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Série en cours (jours)")).toBeInTheDocument();
  });

  it("libellé personnalisé", () => {
    render(<StreakWidget w={1} h={1} data={data} settings={{ label: "Flamme" }} />);
    expect(screen.getByText("Flamme")).toBeInTheDocument();
  });

  it.each([[{}], [{ longest_streak_days: null }], [{ longest_streak_days: NaN }], [null]])("données absentes (%j) : 0, jamais NaN", (d) => {
    const { container } = render(<StreakWidget w={1} h={1} data={d as never} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it("réglages : bascule série en cours, conserve les autres réglages", async () => {
    const onChange = vi.fn();
    render(<StreakSettings settings={{ color: "#fff" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Afficher la série en cours" }));
    expect(onChange).toHaveBeenLastCalledWith({ color: "#fff", showCurrent: true });
  });

  it("réglages : couleur, libellé, icône", async () => {
    const onChange = vi.fn();
    render(<StreakSettings settings={{ showCurrent: true }} onChange={onChange} />);
    expect(screen.getByPlaceholderText("Série en cours (jours)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Afficher l'icône" }));
    expect(onChange).toHaveBeenLastCalledWith({ showCurrent: true, showIcon: true });
  });
});
