import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import { LanguageProvider, useLanguage } from "./languageContext";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useLanguage", () => {
  it("lève une erreur explicite hors du LanguageProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLanguage())).toThrow("languageContext doit être utilisé dans un LanguageProvider");
  });
});

describe("LanguageProvider – langue initiale", () => {
  it("utilise le français par défaut", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("fr");
    expect(result.current.t).toBe(languages.fr);
  });

  it("restaure la langue enregistrée", () => {
    localStorage.setItem("language", "en");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("en");
    expect(result.current.t).toBe(languages.en);
  });

  it.each([["de"], ["EN"], ["fr-FR"], ["undefined"], ["__proto__"], ["constructor"]])(
    "ignore la valeur invalide « %s » enregistrée et garde le français",
    (saved) => {
      localStorage.setItem("language", saved);
      const { result } = renderHook(() => useLanguage(), { wrapper });
      expect(result.current.language).toBe("fr");
      expect(result.current.t).toBe(languages.fr);
    },
  );

  it("ignore une valeur vide enregistrée", () => {
    localStorage.setItem("language", "");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.t).toBe(languages.fr);
  });

  it("ne plante pas quand localStorage est inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("fr");
  });
});

describe("LanguageProvider – changement de langue", () => {
  it("change la langue et le dictionnaire", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.changeLanguage("en"));
    expect(result.current.language).toBe("en");
    expect(result.current.t).toBe(languages.en);
  });

  it("enregistre la langue choisie", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.changeLanguage("en"));
    expect(localStorage.getItem("language")).toBe("en");
  });

  it("peut revenir au français", () => {
    localStorage.setItem("language", "en");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.changeLanguage("fr"));
    expect(result.current.t).toBe(languages.fr);
    expect(localStorage.getItem("language")).toBe("fr");
  });

  it.each([["de"], [""], ["constructor"]])("refuse la langue inconnue « %s » (le dictionnaire reste valide)", (bad) => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.changeLanguage(bad as "fr"));
    expect(result.current.language).toBe("fr");
    expect(result.current.t).toBe(languages.fr);
    expect(localStorage.getItem("language")).toBeNull();
  });

  it("ne plante pas quand l'écriture dans localStorage échoue", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(() => act(() => result.current.changeLanguage("en"))).not.toThrow();
    expect(result.current.language).toBe("en");
  });

  it("met à jour les composants consommateurs", async () => {
    const Probe = () => {
      const { t, changeLanguage } = useLanguage();
      return <button onClick={() => changeLanguage("en")}>{t.account.save}</button>;
    };
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByRole("button")).toHaveTextContent(languages.fr.account.save);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent(languages.en.account.save);
  });
});
