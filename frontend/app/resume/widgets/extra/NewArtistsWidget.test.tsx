import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewArtistsSettings, NewArtistsWidget } from "./NewArtistsWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

describe("NewArtistsWidget", () => {
  it.each([[1, 1], [2, 1], [2, 2]])("%ix%i : nombre et libellé", (w, h) => {
    render(<NewArtistsWidget w={w} h={h} data={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Nouveaux artistes")).toBeInTheDocument();
  });

  it("nombre abrégé et libellé personnalisé", () => {
    render(<NewArtistsWidget w={1} h={1} data={1500} settings={{ shorten: true, label: "Découvertes" }} />);
    expect(screen.getByText("1.5k")).toBeInTheDocument();
    expect(screen.getByText("Découvertes")).toBeInTheDocument();
  });

  it.each([[null], [undefined], [NaN]])("donnée absente (%s) : 0", (d) => {
    const { container } = render(<NewArtistsWidget w={1} h={1} data={d as never} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("réglages : couleur", async () => {
    const onChange = vi.fn();
    render(<NewArtistsSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole("button")[1]);
    expect(onChange).toHaveBeenLastCalledWith({ color: "#FFFFFF" });
  });
});
