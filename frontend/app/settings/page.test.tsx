import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import SettingsPage from "./page";

const h = vi.hoisted(() => ({
  language: "fr" as "fr" | "en",
  changeLanguage: vi.fn(),
  user: { id: 1, user_name: "Yvan Martin", email: "yvan@datayoyo.fr" } as Record<string, unknown> | null,
}));

vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[h.language], language: h.language, changeLanguage: h.changeLanguage }) };
});
vi.mock("../context/authContext", () => ({ useAuth: () => ({ user: h.user }) }));

beforeEach(() => {
  h.language = "fr";
  h.changeLanguage.mockReset();
  h.user = { id: 1, user_name: "Yvan Martin", email: "yvan@datayoyo.fr" };
});

describe("SettingsPage", () => {
  it("affiche le titre, le sous-titre et les sections", () => {
    render(<SettingsPage />);
    const d = languages.fr.settings;
    expect(screen.getByRole("heading", { level: 1, name: d.title })).toBeInTheDocument();
    expect(screen.getByText(d.subtitle)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: d.appearance })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: d.account })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: d.titleLanguage })).toBeInTheDocument();
    expect(screen.getByText(d.subtitleLanguage)).toBeInTheDocument();
  });

  it("affiche les textes en anglais quand la langue est en", () => {
    h.language = "en";
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1, name: languages.en.settings.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: languages.en.settings.account })).toBeInTheDocument();
    expect(screen.queryByText("Compte")).toBeNull();
  });

  describe("choix de la langue", () => {
    it("propose Français et English", () => {
      render(<SettingsPage />);
      expect(screen.getByRole("button", { name: /Français/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
    });

    it("expose la langue active via aria-pressed", () => {
      render(<SettingsPage />);
      expect(screen.getByRole("button", { name: /Français/ })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /English/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("suit la langue active quand elle est en anglais", () => {
      h.language = "en";
      render(<SettingsPage />);
      expect(screen.getByRole("button", { name: /English/ })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /Français/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("un clic sur English appelle changeLanguage('en')", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.click(screen.getByRole("button", { name: /English/ }));
      expect(h.changeLanguage).toHaveBeenCalledTimes(1);
      expect(h.changeLanguage).toHaveBeenCalledWith("en");
    });

    it("un clic sur Français appelle changeLanguage('fr')", async () => {
      const user = userEvent.setup();
      h.language = "en";
      render(<SettingsPage />);
      await user.click(screen.getByRole("button", { name: /Français/ }));
      expect(h.changeLanguage).toHaveBeenCalledWith("fr");
    });

    it("est utilisable au clavier (Tab puis Entrée / Espace)", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);
      await user.tab();
      expect(screen.getByRole("button", { name: /Français/ })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: /English/ })).toHaveFocus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(h.changeLanguage).toHaveBeenCalledTimes(2);
      expect(h.changeLanguage).toHaveBeenNthCalledWith(1, "en");
    });

    it("le nom accessible des boutons n'inclut pas le drapeau (emoji décoratif)", () => {
      render(<SettingsPage />);
      expect(screen.getByRole("button", { name: "Français" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    });
  });

  describe("section compte", () => {
    it("affiche le nom, l'email et les initiales de l'utilisateur connecté", () => {
      render(<SettingsPage />);
      expect(screen.getByText("Yvan Martin")).toBeInTheDocument();
      expect(screen.getByText("yvan@datayoyo.fr")).toBeInTheDocument();
      expect(screen.getByText("YM")).toBeInTheDocument();
    });

    it("n'affiche plus de compte codé en dur", () => {
      render(<SettingsPage />);
      expect(screen.queryByText("Yvan Sv")).toBeNull();
      expect(screen.queryByText("yvan@example.com")).toBeNull();
    });

    it("ne garde qu'une initiale pour un pseudo d'un seul mot, en majuscule", () => {
      h.user = { id: 2, user_name: "neo", email: "neo@x.fr" };
      render(<SettingsPage />);
      expect(screen.getByText("N")).toBeInTheDocument();
    });

    it("limite les initiales à deux lettres", () => {
      h.user = { id: 3, user_name: "Jean Pierre Dupont", email: "j@x.fr" };
      render(<SettingsPage />);
      expect(screen.getByText("JP")).toBeInTheDocument();
    });

    it("ne plante pas sans utilisateur (initiales, nom et email vides)", () => {
      h.user = null;
      expect(() => render(<SettingsPage />)).not.toThrow();
      expect(screen.getByRole("heading", { level: 2, name: languages.fr.settings.account })).toBeInTheDocument();
    });

    it("ne plante pas avec un pseudo vide ou composé d'espaces", () => {
      h.user = { id: 4, user_name: "   ", email: "e@x.fr" };
      expect(() => render(<SettingsPage />)).not.toThrow();
    });

    it("la section compte est inactive (aperçu non interactif)", () => {
      render(<SettingsPage />);
      const section = screen.getByRole("heading", { level: 2, name: languages.fr.settings.account }).closest("section")!;
      expect(section.className).toContain("pointer-events-none");
    });
  });
});
