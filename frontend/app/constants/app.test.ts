import { afterEach, describe, expect, it, vi } from "vitest";

const load = async (url?: string) => {
  vi.resetModules();
  if (url === undefined) vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""); else vi.stubEnv("NEXT_PUBLIC_SITE_URL", url);
  return import("./app");
};

afterEach(() => vi.unstubAllEnvs());

describe("SITE_URL / SITE_HOST", () => {
  it("adresse par défaut sans slash final", async () => {
    const { SITE_URL, SITE_HOST } = await load();
    expect(SITE_URL).toBe("https://mystatsfy.vercel.app");
    expect(SITE_HOST).toBe("mystatsfy.vercel.app");
  });

  it("retire les slashs finaux et les espaces", async () => {
    const { SITE_URL, SITE_HOST } = await load("  https://exemple.fr///  ");
    expect(SITE_URL).toBe("https://exemple.fr");
    expect(SITE_HOST).toBe("exemple.fr");
  });

  it("SITE_HOST retire aussi http://", async () => {
    const { SITE_HOST } = await load("http://localhost:3000/");
    expect(SITE_HOST).toBe("localhost:3000");
  });

  it("APP_NAME", async () => {
    expect((await load()).APP_NAME).toBe("MyStats");
  });
});
