import { describe, expect, it } from "vitest";
import { FRONT_ROUTES } from "./routes";

describe("FRONT_ROUTES", () => {
  it("expose des chemins de classements sans slash final (pour éviter « /my//tracks »)", () => {
    expect(FRONT_ROUTES.MY_RANKINGS).toBe("/my");
    expect(FRONT_ROUTES.ALL_RANKINGS).toBe("/all");
  });

  it.each([
    ["/tracks", "/my/tracks"],
    ["/albums", "/my/albums"],
    ["/artists", "/my/artists"],
  ])("permet de composer %s sans double slash", (suffix, expected) => {
    expect(`${FRONT_ROUTES.MY_RANKINGS}${suffix}`).toBe(expected);
    expect(`${FRONT_ROUTES.MY_RANKINGS}${suffix}`).not.toContain("//");
  });

  it("ne contient aucun chemin avec un double slash", () => {
    for (const path of Object.values(FRONT_ROUTES)) {
      if (typeof path === "string") expect(path).not.toMatch(/\/\//);
    }
  });
});
