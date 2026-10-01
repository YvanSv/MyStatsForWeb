import { afterEach, describe, expect, it, vi } from "vitest";

// next.config.ts lit NODE_ENV à l'import : on recharge le module pour chaque environnement
const loadConfig = async (env: string) => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  return (await import("../next.config")).default;
};
const patterns = async (env: string) => (await loadConfig(env)).images?.remotePatterns ?? [];

afterEach(() => vi.unstubAllEnvs());

describe("next.config – images distantes", () => {
  it("autorise les images Spotify en HTTPS dans tous les environnements", async () => {
    for (const env of ["production", "development"]) {
      expect(await patterns(env)).toContainEqual({ protocol: "https", hostname: "i.scdn.co", port: "", pathname: "/image/**" });
    }
  });

  it("n'autorise en production que Spotify : aucun hôte local", async () => {
    const list = await patterns("production");
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain("127.0.0.1");
    expect(JSON.stringify(list)).not.toContain("localhost");
  });

  it("autorise en plus le serveur local en développement", async () => {
    const list = await patterns("development");
    expect(list).toContainEqual({ protocol: "http", hostname: "127.0.0.1", port: "3001", pathname: "/**" });
  });

  it("ne passe jamais en HTTP un hôte distant", async () => {
    for (const env of ["production", "development"]) {
      for (const p of await patterns(env)) {
        if (p.protocol === "http") expect(p.hostname).toBe("127.0.0.1");
      }
    }
  });
});
