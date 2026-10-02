import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FreeTextSettings, FreeTextWidget } from "./FreeTextWidget";
import { FREE_TEXT_MAX_LENGTH } from "../common";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

describe("FreeTextWidget", () => {
  it.each([[1, 1, "text-[11px]"], [2, 1, "text-xl"], [2, 2, "text-3xl"]])("%ix%i : texte en taille %s", (w, h, cls) => {
    render(<FreeTextWidget w={w} h={h} settings={{ text: "Bonjour" }} />);
    expect(screen.getByText("Bonjour")).toHaveClass(cls);
  });

  it("couleur, alignement et taille", () => {
    const { container } = render(<FreeTextWidget w={2} h={1} settings={{ text: "Hey", color: "#F87171", textAlign: "right", size: "sm" }} />);
    expect(screen.getByText("Hey")).toHaveStyle({ color: "#F87171" });
    expect(screen.getByText("Hey")).toHaveClass("text-sm");
    expect(container.querySelector(".text-right")).not.toBeNull();
  });

  it("borne la longueur à 80 caractères", () => {
    render(<FreeTextWidget w={2} h={1} settings={{ text: "a".repeat(200) }} />);
    expect(screen.getByText("a".repeat(FREE_TEXT_MAX_LENGTH))).toBeInTheDocument();
  });

  it.each([[{}], [{ text: "" }], [{ text: "   " }], [undefined], [{ text: 5 as never }]])("texte vide (%j) : invite d'édition exclue de l'export", (settings) => {
    render(<FreeTextWidget w={2} h={1} settings={settings} />);
    const hint = screen.getByText("Votre message…");
    expect(hint).toHaveAttribute("data-export-ignore", "true");
  });

  it("réglages : saisie bornée et compteur", () => {
    const onChange = vi.fn();
    render(<FreeTextSettings settings={{ text: "abc" }} onChange={onChange} />);
    expect(screen.getByLabelText("Texte")).toHaveAttribute("maxlength", String(FREE_TEXT_MAX_LENGTH));
    expect(screen.getByText(`3/${FREE_TEXT_MAX_LENGTH}`)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Texte"), { target: { value: "z".repeat(120) } });
    expect(onChange).toHaveBeenLastCalledWith({ text: "z".repeat(FREE_TEXT_MAX_LENGTH) });
  });

  it("réglages : alignement, taille, couleur", async () => {
    const onChange = vi.fn();
    render(<FreeTextSettings settings={{ text: "t" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Gauche" }));
    expect(onChange).toHaveBeenLastCalledWith({ text: "t", textAlign: "left" });
    await userEvent.click(screen.getByRole("button", { name: "Petit" }));
    expect(onChange).toHaveBeenLastCalledWith({ text: "t", size: "sm" });
    await userEvent.click(screen.getAllByRole("button")[1]);
    expect(onChange).toHaveBeenLastCalledWith({ text: "t", color: "#FFFFFF" });
  });
});
