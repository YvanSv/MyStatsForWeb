import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";
import { ApiError } from "./api";
import { fr } from "../constants/locales/fr";

const t = fr as unknown as Parameters<typeof errorMessage>[1];

describe("errorMessage", () => {
  it("utilise le détail texte du backend", () => {
    expect(errorMessage(new ApiError(400, { detail: "Email déjà utilisé" }), t)).toBe("Email déjà utilisé");
    expect(errorMessage(new ApiError(500, "boom"), t)).toBe("boom");
  });
  it.each([
    [400, "errorBadRequest"], [401, "errorUnauthorized"], [403, "errorForbidden"], [404, "errorNotFound"],
    [409, "errorConflict"], [422, "errorValidation"], [429, "errorRateLimit"], [500, "errorServer"], [503, "errorServer"],
  ] as const)("statut %i sans détail texte -> message traduit", (status, key) => {
    const msg = errorMessage(new ApiError(status, [{ msg: "x" }]), t);
    expect(msg).toBe(t.api[key]);
    expect(msg).not.toBe("API_ERROR");
  });
  it("statut inconnu -> message générique", () => {
    expect(errorMessage(new ApiError(418, null), t)).toBe(t.api.error1);
  });
  it("TypeError fetch -> message réseau", () => {
    expect(errorMessage(new TypeError("Failed to fetch"), t)).toBe(t.api.errorConnecting);
  });
  it("Error simple avec statut : message conservé, sauf API_ERROR", () => {
    expect(errorMessage(Object.assign(new Error("API_ERROR"), { status: 404 }), t)).toBe(t.api.errorNotFound);
    expect(errorMessage(new Error("custom"), t)).toBe("custom");
  });
  it("sans détail ni statut, utilise le message de repli fourni", () => {
    expect(errorMessage(new Error(""), t, "repli")).toBe("repli");
    expect(errorMessage(new ApiError(500, null), t, "repli")).toBe(t.api.errorServer);
  });
  it("valeur inconnue -> générique", () => {
    expect(errorMessage("x", t)).toBe(t.api.error1);
    expect(errorMessage(undefined, t)).toBe(t.api.error1);
  });
});
