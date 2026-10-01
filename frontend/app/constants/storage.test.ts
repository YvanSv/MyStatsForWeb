import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./storage";

describe("STORAGE_KEYS", () => {
  it("conserve les valeurs déjà écrites chez les utilisateurs", () => {
    expect(STORAGE_KEYS).toEqual({
      LANGUAGE: "language",
      VIEW_MODE: "globalViewMode",
      SHOW_FILTERS: "globalShowFilters",
      RESUME_LAYOUT: "mystats-resume-layout-v1",
    });
  });

  it("n'a pas de clé en double", () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});
