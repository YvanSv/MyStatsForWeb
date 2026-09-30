import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { ShowFiltersProvider, useShowFilters } from "./showFiltersContext";

vi.mock("./languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const KEY = "globalShowFilters";
const wrapper = ({ children }: { children: React.ReactNode }) => <ShowFiltersProvider>{children}</ShowFiltersProvider>;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useShowFilters", () => {
  it("lève une erreur explicite hors du provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useShowFilters())).toThrow(`useShowFilters ${languages.fr.context.template} ShowFiltersProvider`);
  });
});

describe("ShowFiltersProvider – état initial", () => {
  it("masque les filtres par défaut", () => {
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    expect(result.current.showFilters).toBe(false);
  });

  it.each([["true", true], ["false", false]])("restaure la valeur enregistrée %s", (saved, expected) => {
    localStorage.setItem(KEY, saved);
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    expect(result.current.showFilters).toBe(expected);
  });

  it.each([["pas du json"], ["{"], ["undefined"], ["null"], ["1"], ['"true"'], ["[]"], ['{"a":1}']])(
    "ignore la valeur invalide « %s » enregistrée (masqué par défaut, sans planter)",
    (saved) => {
      localStorage.setItem(KEY, saved);
      const { result } = renderHook(() => useShowFilters(), { wrapper });
      expect(result.current.showFilters).toBe(false);
    },
  );

  it("ne plante pas quand localStorage est inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    expect(result.current.showFilters).toBe(false);
  });
});

describe("ShowFiltersProvider – bascule", () => {
  it("affiche puis masque les filtres", () => {
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    act(() => result.current.toggleShowFilters());
    expect(result.current.showFilters).toBe(true);
    act(() => result.current.toggleShowFilters());
    expect(result.current.showFilters).toBe(false);
  });

  it("enregistre chaque nouvel état", () => {
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    act(() => result.current.toggleShowFilters());
    expect(localStorage.getItem(KEY)).toBe("true");
    act(() => result.current.toggleShowFilters());
    expect(localStorage.getItem(KEY)).toBe("false");
  });

  it("repart de la valeur restaurée", () => {
    localStorage.setItem(KEY, "true");
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    act(() => result.current.toggleShowFilters());
    expect(result.current.showFilters).toBe(false);
  });

  it("enchaîne correctement plusieurs bascules dans le même cycle", () => {
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    act(() => { result.current.toggleShowFilters(); result.current.toggleShowFilters(); result.current.toggleShowFilters(); });
    expect(result.current.showFilters).toBe(true);
  });

  it("garde l'état affiché quand l'écriture dans localStorage échoue", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    const { result } = renderHook(() => useShowFilters(), { wrapper });
    expect(() => act(() => result.current.toggleShowFilters())).not.toThrow();
    expect(result.current.showFilters).toBe(true);
  });
});
