import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FRONT_ROUTES } from "./routes";

// routes.ts lit NEXT_PUBLIC_API_URL à l'import : on recharge le module pour chaque valeur testée
const loadRoutes = async (apiUrl?: string) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl ?? "");
  return import("./routes");
};

afterEach(() => vi.unstubAllEnvs());

const BASE = "http://127.0.0.1:8000";

describe("FRONT_ROUTES – pages existantes", () => {
  // Chaque route déclarée doit avoir son page.tsx : sinon un lien mène à une 404
  const appDir = path.resolve(import.meta.dirname, "..");
  const pageFor = (route: string) => path.join(appDir, route === "/" ? "" : route, "page.tsx");

  it.each(Object.entries(FRONT_ROUTES))("%s a une page", (_key, route) => {
    expect(fs.existsSync(pageFor(route)), `${route} → ${pageFor(route)}`).toBe(true);
  });
});

describe("FRONT_ROUTES", () => {
  it("expose des chemins de classements sans slash final (pour éviter « /my//tracks »)", () => {
    expect(FRONT_ROUTES.MY_RANKINGS).toBe("/my");
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

  it.each([
    ["ACCUEIL", "/"],
    ["AUTH", "/auth"],
    ["IMPORT", "/import"],
    ["ACCOUNT", "/account"],
    ["DASHBOARD", "/profile/dashboard"],
    ["ABOUT", "/about"],
    ["PROFILE", "/profile"],
    ["PROFILE_EDIT", "/profile/edit"],
    ["HELP", "/faq"],
    ["SETTINGS", "/settings"],
    ["RESUME", "/resume"],
  ] as const)("%s mène vers %s", (key, path) => {
    expect(FRONT_ROUTES[key]).toBe(path);
  });

  it("commence toujours par un slash", () => {
    for (const path of Object.values(FRONT_ROUTES)) expect(path.startsWith("/")).toBe(true);
  });

  it("n'a aucun slash final, sauf la racine", () => {
    for (const path of Object.values(FRONT_ROUTES)) {
      if (path !== "/") expect(path.endsWith("/")).toBe(false);
    }
  });

  it("a des chemins tous différents", () => {
    const paths = Object.values(FRONT_ROUTES);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("place l'édition du profil et le dashboard sous /profile", () => {
    expect(FRONT_ROUTES.PROFILE_EDIT.startsWith(`${FRONT_ROUTES.PROFILE}/`)).toBe(true);
    expect(FRONT_ROUTES.DASHBOARD.startsWith(`${FRONT_ROUTES.PROFILE}/`)).toBe(true);
  });
});

describe("API_ENDPOINTS – URL de base", () => {
  it("utilise http://127.0.0.1:8000 par défaut", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    expect(API_ENDPOINTS.LOGIN).toBe(`${BASE}/auth/login`);
  });

  it("utilise NEXT_PUBLIC_API_URL quand elle est définie", async () => {
    const { API_ENDPOINTS } = await loadRoutes("https://api.mystats.app");
    expect(API_ENDPOINTS.LOGIN).toBe("https://api.mystats.app/auth/login");
    expect(API_ENDPOINTS.ALL_TRACKS).toBe("https://api.mystats.app/data/all/tracks");
  });

  it.each([
    ["https://api.mystats.app/", "https://api.mystats.app"],
    ["https://api.mystats.app///", "https://api.mystats.app"],
    ["http://localhost:9000/", "http://localhost:9000"],
  ])("ignore le slash final de l'URL de base (%s)", async (input, base) => {
    const { API_ENDPOINTS } = await loadRoutes(input);
    expect(API_ENDPOINTS.LOGIN).toBe(`${base}/auth/login`);
    expect(Object.values(API_ENDPOINTS).every((url) => !url.replace("://", "").includes("//"))).toBe(true);
  });

  it("garde un éventuel préfixe de chemin dans l'URL de base", async () => {
    const { API_ENDPOINTS } = await loadRoutes("https://exemple.fr/api");
    expect(API_ENDPOINTS.ME).toBe("https://exemple.fr/api/auth/me");
  });

  it("retombe sur l'URL par défaut quand la variable est vide", async () => {
    const { API_ENDPOINTS } = await loadRoutes("");
    expect(API_ENDPOINTS.ME).toBe(`${BASE}/auth/me`);
  });

  describe("en production", () => {
    const loadInProduction = async (apiUrl?: string) => {
      vi.stubEnv("NODE_ENV", "production");
      return loadRoutes(apiUrl);
    };

    it("échoue avec un message clair quand NEXT_PUBLIC_API_URL est absente ou vide", async () => {
      await expect(loadInProduction(undefined)).rejects.toThrow(/NEXT_PUBLIC_API_URL doit être définie en production/);
      await expect(loadInProduction("")).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
    });

    it("échoue aussi quand la variable ne contient que des espaces", async () => {
      await expect(loadInProduction("   ")).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
    });

    it("n'utilise jamais localhost : une URL définie est utilisée telle quelle", async () => {
      const { API_ENDPOINTS } = await loadInProduction("https://api.mystats.app/");
      expect(API_ENDPOINTS.LOGIN).toBe("https://api.mystats.app/auth/login");
      expect(Object.values(API_ENDPOINTS).some((u) => u.includes("127.0.0.1"))).toBe(false);
    });
  });

  it("en développement et en test, l'URL locale par défaut reste disponible", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { API_ENDPOINTS } = await loadRoutes(undefined);
    expect(API_ENDPOINTS.ME).toBe(`${BASE}/auth/me`);
  });

  it("dérive tous les endpoints de la même base", async () => {
    const { API_ENDPOINTS } = await loadRoutes("https://api.mystats.app");
    for (const url of Object.values(API_ENDPOINTS)) expect(url.startsWith("https://api.mystats.app/")).toBe(true);
  });
});

describe("API_ENDPOINTS – contrat avec le backend", () => {
  // Chemins exposés par le backend FastAPI (vérifiés contre son OpenAPI)
  const CONTRACT: Record<string, string> = {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    EDIT_INFOS: "/auth/update",
    DELETE_ACCOUNT: "/auth/delete",
    SPOTIFY_LOGIN: "/auth/spotify-login",
    SPOTIFY_IMPORT: "/import/spotify",
    APPLE_IMPORT: "/import/apple",
    HOME_DATA: "/data/overview",
    SPOTIFY_STATUS: "/spotify/status",
    PROFILE_DATA: "/profile",
    PROFILE_DATA_TOPS: "/profile/tops",
    SIMPLE_PROFILE_DATA: "/profile/simple",
    EDITABLE_PROFILE_DATA: "/edit-profile",
    DASHBOARD_DATA: "/profile/dashboard",
    WEBSOCKET_PROGRESS: "/ws/progress",
    ALL_TRACKS: "/data/all/tracks",
    ALL_TRACKS_METADATA: "/data/all/tracks/metadata",
    ALL_ARTISTS: "/data/all/artists",
    ALL_ARTISTS_METADATA: "/data/all/artists/metadata",
    ALL_ALBUMS: "/data/all/albums",
    ALL_ALBUMS_METADATA: "/data/all/albums/metadata",
    TRACKS: "/data/my/tracks",
    TRACKS_METADATA: "/data/my/tracks/metadata",
    ARTISTS: "/data/my/artists",
    ARTISTS_METADATA: "/data/my/artists/metadata",
    ALBUMS: "/data/my/albums",
    ALBUMS_METADATA: "/data/my/albums/metadata",
    CLEAR_ACCOUNT: "/data/my/clear",
    REFRESH_USER_DATA: "/data/my/refresh",
    TODAY_STATS: "/data/my/today",
    CURRENTLY_PLAYING: "/data/my/currently-playing",
    PAUSE: "/data/my/currently-playing/pause",
    RESUME: "/data/my/currently-playing/resume",
    NEXT: "/data/my/currently-playing/next",
    PREVIOUS: "/data/my/currently-playing/previous",
    SHARE: "/data/my/resume",
    ERRORS: "/admin/errors",
    MERGE_REQUESTS: "/admin/merge-requests",
    CREATE_REQUESTS: "/admin/create-requests",
  };

  it.each(Object.entries(CONTRACT))("%s -> %s", async (key, path) => {
    const { API_ENDPOINTS } = await loadRoutes();
    expect(API_ENDPOINTS[key as keyof typeof API_ENDPOINTS]).toBe(`${BASE}${path}`);
  });

  it("n'expose aucun endpoint en dehors du contrat (ni oublié, ni en trop)", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    expect(Object.keys(API_ENDPOINTS).sort()).toEqual(Object.keys(CONTRACT).sort());
  });

  it("n'a aucune URL en double", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    const urls = Object.values(API_ENDPOINTS);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("n'a aucun slash final ni double slash (hors protocole)", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    for (const url of Object.values(API_ENDPOINTS)) {
      expect(url.endsWith("/")).toBe(false);
      expect(url.replace("://", "")).not.toContain("//");
    }
  });

  it.each(["TRACKS", "ARTISTS", "ALBUMS", "ALL_TRACKS", "ALL_ARTISTS", "ALL_ALBUMS"] as const)(
    "%s a une route /metadata associée",
    async (key) => {
      const { API_ENDPOINTS } = await loadRoutes();
      expect(API_ENDPOINTS[`${key}_METADATA` as keyof typeof API_ENDPOINTS]).toBe(`${API_ENDPOINTS[key]}/metadata`);
    },
  );

  it("place les contrôles de lecture sous /currently-playing", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    for (const key of ["PAUSE", "RESUME", "NEXT", "PREVIOUS"] as const) {
      expect(API_ENDPOINTS[key].startsWith(`${API_ENDPOINTS.CURRENTLY_PLAYING}/`)).toBe(true);
    }
  });

  it("sépare les données personnelles (/data/my) des données globales (/data/all)", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    for (const key of ["TRACKS", "ARTISTS", "ALBUMS"] as const) {
      expect(API_ENDPOINTS[key]).toContain("/data/my/");
      expect(API_ENDPOINTS[`ALL_${key}` as keyof typeof API_ENDPOINTS]).toContain("/data/all/");
    }
  });

  it("réserve /admin aux routes d'administration", async () => {
    const { API_ENDPOINTS } = await loadRoutes();
    const admin = Object.entries(API_ENDPOINTS).filter(([, url]) => url.includes("/admin/"));
    expect(admin.map(([key]) => key).sort()).toEqual(["CREATE_REQUESTS", "ERRORS", "MERGE_REQUESTS"]);
  });
});
