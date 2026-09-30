import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { ViewModeProvider, useViewMode } from "./viewModeContext";

vi.mock("./languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const KEY = "globalViewMode";
const wrapper = ({ children }: { children: React.ReactNode }) => <ViewModeProvider>{children}</ViewModeProvider>;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useViewMode", () => {
  it("lève une erreur explicite hors du provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useViewMode())).toThrow(`useViewMode ${languages.fr.context.template} ViewModeProvider`);
  });
});

describe("ViewModeProvider – état initial", () => {
  it("utilise la grille par défaut", () => {
    const { result } = renderHook(() => useViewMode(), { wrapper });
    expect(result.current.viewMode).toBe("grid");
  });

  it.each([["grid_sm"], ["grid"], ["list"]])("restaure le mode enregistré « %s »", (saved) => {
    localStorage.setItem(KEY, saved);
    const { result } = renderHook(() => useViewMode(), { wrapper });
    expect(result.current.viewMode).toBe(saved);
  });

  it.each([["tableau"], ["LIST"], ["grid "], ["undefined"], ["null"], ["__proto__"]])(
    "ignore le mode invalide « %s » enregistré et garde la grille",
    (saved) => {
      localStorage.setItem(KEY, saved);
      const { result } = renderHook(() => useViewMode(), { wrapper });
      expect(result.current.viewMode).toBe("grid");
    },
  );

  it("ignore une valeur vide enregistrée", () => {
    localStorage.setItem(KEY, "");
    const { result } = renderHook(() => useViewMode(), { wrapper });
    expect(result.current.viewMode).toBe("grid");
  });

  it("ne plante pas quand localStorage est inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    const { result } = renderHook(() => useViewMode(), { wrapper });
    expect(result.current.viewMode).toBe("grid");
  });
});

describe("ViewModeProvider – changement de mode", () => {
  it.each([["grid_sm"], ["list"], ["grid"]] as const)("passe en mode %s et l'enregistre", (mode) => {
    const { result } = renderHook(() => useViewMode(), { wrapper });
    act(() => result.current.toggleViewMode(mode));
    expect(result.current.viewMode).toBe(mode);
    expect(localStorage.getItem(KEY)).toBe(mode);
  });

  it("enchaîne plusieurs changements", () => {
    const { result } = renderHook(() => useViewMode(), { wrapper });
    act(() => result.current.toggleViewMode("list"));
    act(() => result.current.toggleViewMode("grid_sm"));
    expect(result.current.viewMode).toBe("grid_sm");
    expect(localStorage.getItem(KEY)).toBe("grid_sm");
  });

  it("garde le mode choisi quand l'écriture dans localStorage échoue", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    const { result } = renderHook(() => useViewMode(), { wrapper });
    expect(() => act(() => result.current.toggleViewMode("list"))).not.toThrow();
    expect(result.current.viewMode).toBe("list");
  });
});
