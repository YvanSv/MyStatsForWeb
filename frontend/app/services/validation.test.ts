import { describe, expect, it } from "vitest";
import { imageError, normalizeSlug, slugError } from "./validation";
import { MAX_IMAGE_BYTES, SLUG_MAX } from "../constants/validation";

describe("normalizeSlug", () => {
  it("met en minuscules, remplace les espaces par des tirets et retire les caractères interdits", () => {
    expect(normalizeSlug("Mon  Profil_é!")).toBe("mon-profil");
  });
});

describe("slugError", () => {
  it("accepte un slug valide", () => expect(slugError("yvan-42")).toBeNull());
  it("accepte un slug vide", () => expect(slugError("")).toBeNull());
  it("refuse un slug numérique", () => expect(slugError("123")).toBe("numeric"));
  it("refuse un slug réservé", () => expect(slugError("admin")).toBe("reserved"));
  it("refuse un slug trop long", () => {
    expect(slugError("a".repeat(SLUG_MAX))).toBeNull();
    expect(slugError("a".repeat(SLUG_MAX + 1))).toBe("length");
  });
});

describe("imageError", () => {
  it("accepte une image autorisée de taille correcte", () => {
    expect(imageError({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });
  it("refuse un type non autorisé (SVG)", () => {
    expect(imageError({ type: "image/svg+xml", size: 10 })).toBe("type");
  });
  it("refuse une image trop lourde", () => {
    expect(imageError({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toBe("size");
  });
});
