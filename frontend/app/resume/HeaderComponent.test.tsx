/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderComponent } from "./HeaderComponent";

const h = vi.hoisted(() => ({ setRange: vi.fn(), setOffset: vi.fn() }));

vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const RANGES = ["day", "month", "season", "year", "lifetime"];

const setup = (over: Record<string, any> = {}) =>
  render(
    <HeaderComponent range="year" setRange={h.setRange} offset={0} setOffset={h.setOffset} displayLabel="2026" {...over} />,
  );

// Boutons de navigation : les deux derniers boutons (moins puis plus)
const navButtons = () => {
  const all = screen.getAllByRole("button");
  return { minus: all[all.length - 2], plus: all[all.length - 1] };
};

beforeEach(() => {
  h.setRange.mockReset();
  h.setOffset.mockReset();
});

describe("HeaderComponent – rendu", () => {
  it("affiche un bouton par type de période, dans l'ordre", () => {
    setup();
    const names = screen.getAllByRole("button").slice(0, 5).map((b) => b.textContent);
    expect(names).toEqual(RANGES);
  });

  it("affiche le libellé fourni (chaîne)", () => {
    setup({ displayLabel: "Octobre 2026" });
    expect(screen.getByText("Octobre 2026")).toBeInTheDocument();
  });

  it("affiche le libellé fourni (nombre, y compris 0)", () => {
    setup({ displayLabel: 0 });
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("accepte un libellé vide sans planter", () => {
    setup({ displayLabel: "" });
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });

  it("met en évidence uniquement la période active", () => {
    setup({ range: "month" });
    RANGES.forEach((r) => {
      const btn = screen.getByRole("button", { name: r });
      if (r === "month") expect(btn.className).toContain("bg-white/10");
      else expect(btn.className).not.toContain("bg-white/10");
    });
  });

  it("n'appelle aucun setter au rendu", () => {
    setup();
    expect(h.setRange).not.toHaveBeenCalled();
    expect(h.setOffset).not.toHaveBeenCalled();
  });
});

describe("HeaderComponent – changement de période", () => {
  it.each(RANGES)("cliquer sur « %s » appelle setRange puis remet l'offset à 0", async (r) => {
    setup({ range: r === "day" ? "year" : "day", offset: 3 });
    await userEvent.click(screen.getByRole("button", { name: r }));
    expect(h.setRange).toHaveBeenCalledWith(r);
    expect(h.setOffset).toHaveBeenCalledWith(0);
    expect(h.setRange.mock.invocationCallOrder[0]).toBeLessThan(h.setOffset.mock.invocationCallOrder[0]);
  });

  it("recliquer sur la période déjà active réinitialise quand même l'offset", async () => {
    setup({ range: "year", offset: 2 });
    await userEvent.click(screen.getByRole("button", { name: "year" }));
    expect(h.setRange).toHaveBeenCalledWith("year");
    expect(h.setOffset).toHaveBeenCalledWith(0);
  });

  it("est activable au clavier (Entrée et Espace)", async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole("button", { name: "month" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(h.setRange).toHaveBeenCalledTimes(2);
    expect(h.setRange).toHaveBeenCalledWith("month");
  });
});

describe("HeaderComponent – navigation temporelle", () => {
  it("« moins » incrémente l'offset via un updater fonctionnel", async () => {
    setup({ offset: 2 });
    await userEvent.click(navButtons().minus);
    expect(h.setOffset).toHaveBeenCalledTimes(1);
    const updater = h.setOffset.mock.calls[0][0] as (n: number) => number;
    expect(updater(0)).toBe(1);
    expect(updater(5)).toBe(6);
  });

  it("« plus » décrémente l'offset sans jamais passer sous 0", async () => {
    setup({ offset: 2 });
    await userEvent.click(navButtons().plus);
    const updater = h.setOffset.mock.calls[0][0] as (n: number) => number;
    expect(updater(3)).toBe(2);
    expect(updater(1)).toBe(0);
    expect(updater(0)).toBe(0);
  });

  it("« plus » est désactivé quand l'offset vaut 0", async () => {
    setup({ offset: 0 });
    expect(navButtons().plus).toBeDisabled();
    await userEvent.click(navButtons().plus);
    expect(h.setOffset).not.toHaveBeenCalled();
  });

  it("« plus » est actif quand l'offset est positif, « moins » toujours actif hors lifetime", () => {
    setup({ offset: 1 });
    expect(navButtons().plus).toBeEnabled();
    expect(navButtons().minus).toBeEnabled();
  });

  it("désactive les deux boutons de navigation en lifetime, même avec un offset", async () => {
    setup({ range: "lifetime", offset: 4 });
    expect(navButtons().minus).toBeDisabled();
    expect(navButtons().plus).toBeDisabled();
    await userEvent.click(navButtons().minus);
    await userEvent.click(navButtons().plus);
    expect(h.setOffset).not.toHaveBeenCalled();
  });

  it("les boutons de période restent actifs en lifetime", () => {
    setup({ range: "lifetime" });
    RANGES.forEach((r) => expect(screen.getByRole("button", { name: r })).toBeEnabled());
  });

  it("les boutons désactivés ne sont pas atteignables au clavier", async () => {
    const user = userEvent.setup();
    setup({ range: "lifetime" });
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(navButtons().minus).not.toHaveFocus();
    expect(navButtons().plus).not.toHaveFocus();
  });
});

describe("HeaderComponent – accessibilité", () => {
  it("les boutons moins/plus ont un nom accessible (icônes seules)", () => {
    setup({ offset: 1 });
    const { minus, plus } = navButtons();
    expect(minus).toHaveAccessibleName();
    expect(plus).toHaveAccessibleName();
  });

  it("le bouton de la période active expose son état (aria-pressed)", () => {
    setup({ range: "month" });
    expect(screen.getByRole("button", { name: "month" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "year" })).toHaveAttribute("aria-pressed", "false");
  });
});
