import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { FRONT_ROUTES } from "../constants/routes";
import { TECHNOS } from "../constants/technos";
import AboutPage from "./page";

const h = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[h.lang], language: h.lang, changeLanguage: vi.fn() }) };
});

beforeEach(() => {
  h.lang = "fr";
});

describe("AboutPage", () => {
  it("affiche le titre, le sous-titre et l'introduction", () => {
    render(<AboutPage />);
    const d = languages.fr.about;
    expect(screen.getByRole("heading", { level: 1, name: d.title })).toBeInTheDocument();
    expect(screen.getByText(d.subtitle)).toBeInTheDocument();
    expect(screen.getByText(d.intro1)).toBeInTheDocument();
    expect(screen.getByText(d.intro2)).toBeInTheDocument();
  });

  it("liste les quatre fonctionnalités", () => {
    render(<AboutPage />);
    const d = languages.fr.about;
    const section = screen.getByRole("heading", { level: 2, name: d.featuresTitle }).closest("section")!;
    const items = within(section).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([d.feature1, d.feature2, d.feature3, d.feature4]);
  });

  it("affiche les technologies du projet", () => {
    render(<AboutPage />);
    const section = screen.getByRole("heading", { level: 2, name: languages.fr.about.stackTitle }).closest("section")!;
    expect(within(section).getAllByRole("listitem").map((i) => i.textContent)).toEqual(TECHNOS);
  });

  it("renvoie vers la FAQ et l'accueil", () => {
    render(<AboutPage />);
    const d = languages.fr.about;
    expect(screen.getByRole("link", { name: d.faqLink })).toHaveAttribute("href", FRONT_ROUTES.HELP);
    expect(screen.getByRole("link", { name: d.backHome })).toHaveAttribute("href", FRONT_ROUTES.ACCUEIL);
  });

  it("s'affiche en anglais quand la langue est en", () => {
    h.lang = "en";
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: languages.en.about.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: languages.en.about.faqLink })).toBeInTheDocument();
    expect(screen.queryByText(languages.fr.about.intro1)).toBeNull();
  });

  it("les textes fr et en existent tous et ne sont pas vides", () => {
    for (const lang of ["fr", "en"] as const) {
      for (const [key, value] of Object.entries(languages[lang].about)) {
        expect(typeof value, `${lang}.about.${key}`).toBe("string");
        expect((value as string).trim().length, `${lang}.about.${key}`).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(languages.fr.about).sort()).toEqual(Object.keys(languages.en.about).sort());
  });
});
