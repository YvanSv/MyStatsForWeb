import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { SettingLabel, SETTING_LABEL_CLASS } from "./SettingLabel";

vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

describe("ColorSwatchPicker", () => {
  it("affiche le libellé, marque la pastille active et appelle onChange", async () => {
    const onChange = vi.fn();
    render(<ColorSwatchPicker colors={["#111111", "#222222"]} value="#222222" onChange={onChange} label="Couleur" />);
    expect(screen.getByText("Couleur")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1].className).toContain("border-white");
    expect(buttons[0].className).not.toContain("shadow-md");
    await userEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith("#111111");
  });

  it("ajoute l'ombre aux pastilles non sélectionnées avec shadow", () => {
    render(<ColorSwatchPicker colors={["#111111", "#222222"]} value="#222222" onChange={vi.fn()} label="x" shadow />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toContain("shadow-md");
    expect(buttons[1].className).not.toContain("shadow-md");
  });
});

describe("SettingLabel", () => {
  it("applique le style et transmet htmlFor", () => {
    render(<SettingLabel htmlFor="a">Titre</SettingLabel>);
    const l = screen.getByText("Titre");
    expect(l).toHaveAttribute("for", "a");
    expect(l.className).toBe(SETTING_LABEL_CLASS);
  });
});
