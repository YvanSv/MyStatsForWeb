import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStorage, writeStorage } from "./storage";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("readStorage", () => {
  it("renvoie la valeur enregistrée", () => {
    localStorage.setItem("k", "valeur");
    expect(readStorage("k")).toBe("valeur");
  });

  it("renvoie null pour une clé absente", () => {
    expect(readStorage("absente")).toBeNull();
  });

  it("renvoie une chaîne vide telle quelle", () => {
    localStorage.setItem("k", "");
    expect(readStorage("k")).toBe("");
  });

  it("renvoie null au lieu de lever quand localStorage est inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    expect(readStorage("k")).toBeNull();
  });
});

describe("writeStorage", () => {
  it("enregistre la valeur", () => {
    writeStorage("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });

  it("écrase la valeur précédente", () => {
    writeStorage("k", "1");
    writeStorage("k", "2");
    expect(localStorage.getItem("k")).toBe("2");
  });

  it("ne lève pas quand l'écriture échoue (stockage plein ou bloqué)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => writeStorage("k", "v")).not.toThrow();
  });
});
