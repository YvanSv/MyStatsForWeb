import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LogoSettings, LogoWidget } from "./LogoWidget";
import { APP_NAME } from "../../../constants/app";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

describe("LogoWidget", () => {
  it.each([[1, 1], [2, 1], [2, 2]])("%ix%i : logo et nom de l'application", (w, h) => {
    const { container } = render(<LogoWidget w={w} h={h} />);
    expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/logo.png");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("opacité par défaut, réglée, et bornée", () => {
    const { rerender } = render(<LogoWidget w={1} h={1} />);
    expect(screen.getByTestId("logo-box")).toHaveStyle({ opacity: "0.4" });
    rerender(<LogoWidget w={1} h={1} settings={{ opacity: 0.8 }} />);
    expect(screen.getByTestId("logo-box")).toHaveStyle({ opacity: "0.8" });
    rerender(<LogoWidget w={1} h={1} settings={{ opacity: 7 }} />);
    expect(screen.getByTestId("logo-box")).toHaveStyle({ opacity: "1" });
    rerender(<LogoWidget w={1} h={1} settings={{ opacity: NaN }} />);
    expect(screen.getByTestId("logo-box")).toHaveStyle({ opacity: "0.4" });
  });

  it("réglages : curseur d'opacité", () => {
    const onChange = vi.fn();
    render(<LogoSettings settings={{ opacity: 0.5 }} onChange={onChange} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Opacité du logo" }), { target: { value: "0.25" } });
    expect(onChange).toHaveBeenCalledWith({ opacity: 0.25 });
  });
});
