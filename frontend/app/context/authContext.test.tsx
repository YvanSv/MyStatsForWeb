import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { API_ENDPOINTS } from "../constants/routes";
import { AuthProvider, useAuth } from "./authContext";

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({ request: vi.fn(), push: vi.fn() }));

vi.mock("../hooks/useApi", () => ({ useApi: () => ({ request: h.request }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("./languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

// --- Helpers ---------------------------------------------------------------

const USER = {
  id: 1, user_name: "Yvan", slug: "yvan", email: "yvan@example.com", avatar: "", is_logged_in: true, isAdmin: false,
  providers: { SPOTIFY: { has: false, email: null }, APPLE_MUSIC: { has: false, email: null }, MUSICBRAINZ: { has: false, email: null } },
};

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

/** Simule le backend : /auth/me renvoie l'utilisateur courant (ou 401), le reste réussit. */
let me: unknown;
const routes = (overrides: Record<string, (opts?: RequestInit) => unknown> = {}) =>
  h.request.mockImplementation(async (url: string, opts?: RequestInit) => {
    const handler = overrides[url];
    if (handler) return handler(opts);
    if (url === API_ENDPOINTS.ME) {
      if (me instanceof Error) throw me;
      return me;
    }
    return {};
  });

const callsTo = (url: string) => h.request.mock.calls.filter(([u]) => u === url);

const renderAuth = async () => {
  const utils = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(utils.result.current.loading).toBe(false));
  return utils;
};

beforeEach(() => {
  vi.clearAllMocks();
  me = USER;
  routes();
});
afterEach(() => vi.restoreAllMocks());

// --- Tests -----------------------------------------------------------------

describe("useAuth", () => {
  it("lève une erreur explicite hors du AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(`useAuth ${languages.fr.context.template} AuthProvider`);
  });
});

describe("AuthProvider – chargement initial", () => {
  it("démarre en chargement, sans utilisateur", () => {
    h.request.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("interroge /auth/me une seule fois au montage", async () => {
    await renderAuth();
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(1);
  });

  it("charge l'utilisateur connecté", async () => {
    const { result } = await renderAuth();
    expect(result.current.user).toEqual(USER);
    expect(result.current.isLoggedIn).toBe(true);
  });

  it("considère l'utilisateur comme déconnecté quand /auth/me échoue (401)", async () => {
    me = Object.assign(new Error("Session expirée"), { status: 401 });
    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("considère l'utilisateur comme déconnecté quand le serveur est injoignable", async () => {
    me = new TypeError("Failed to fetch");
    const { result } = await renderAuth();
    expect(result.current.user).toBeNull();
  });

  it("expose le statut administrateur et les fournisseurs", async () => {
    me = { ...USER, isAdmin: true, providers: { ...USER.providers, SPOTIFY: { has: true, email: "s@x.fr" } } };
    const { result } = await renderAuth();
    expect(result.current.user?.isAdmin).toBe(true);
    expect(result.current.user?.providers.SPOTIFY).toEqual({ has: true, email: "s@x.fr" });
  });
});

describe("AuthProvider – refreshUser", () => {
  it("recharge l'utilisateur", async () => {
    const { result } = await renderAuth();
    me = { ...USER, user_name: "Nouveau" };
    await act(async () => { await result.current.refreshUser(); });
    expect(result.current.user?.user_name).toBe("Nouveau");
  });

  it("passe en chargement pendant l'appel puis revient à faux", async () => {
    const { result } = await renderAuth();
    let resolve!: (v: unknown) => void;
    routes({ [API_ENDPOINTS.ME]: () => new Promise((r) => (resolve = r)) });
    let pending!: Promise<void>;
    act(() => { pending = result.current.refreshUser(); });
    expect(result.current.loading).toBe(true);
    await act(async () => { resolve(USER); await pending; });
    expect(result.current.loading).toBe(false);
  });

  it("déconnecte l'utilisateur quand la session a expiré", async () => {
    const { result } = await renderAuth();
    me = Object.assign(new Error("401"), { status: 401 });
    await act(async () => { await result.current.refreshUser(); });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });
});

describe("AuthProvider – login", () => {
  it("envoie email et mot de passe en JSON par POST", async () => {
    me = new Error("non connecté");
    const { result } = await renderAuth();
    await act(async () => { await result.current.login("yvan@example.com", "motdepasse"); });
    const [, opts] = callsTo(API_ENDPOINTS.LOGIN)[0];
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ email: "yvan@example.com", password: "motdepasse" });
  });

  it("recharge l'utilisateur via /auth/me quand la réponse ne le contient pas", async () => {
    me = new Error("non connecté");
    const { result } = await renderAuth();
    me = USER;
    await act(async () => { await result.current.login("a@b.fr", "x"); });
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(2);
    expect(result.current.user).toEqual(USER);
  });

  it("utilise directement l'utilisateur de la réponse quand elle le contient", async () => {
    me = new Error("non connecté");
    routes({ [API_ENDPOINTS.LOGIN]: () => ({ user: USER }) });
    const { result } = await renderAuth();
    await act(async () => { await result.current.login("a@b.fr", "x"); });
    expect(result.current.user).toEqual(USER);
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(1);
  });

  it("relance l'erreur de l'API et reste déconnecté", async () => {
    me = new Error("non connecté");
    const failure = Object.assign(new Error("Email ou mot de passe incorrect"), { status: 401 });
    routes({ [API_ENDPOINTS.LOGIN]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.login("a@b.fr", "mauvais"); })).rejects.toBe(failure);
    expect(result.current.user).toBeNull();
  });
});

describe("AuthProvider – register", () => {
  it("crée le compte puis connecte automatiquement l'utilisateur", async () => {
    me = new Error("non connecté");
    const { result } = await renderAuth();
    me = USER;
    await act(async () => { await result.current.register("Yvan", "yvan@example.com", "motdepasse"); });

    const [, registerOpts] = callsTo(API_ENDPOINTS.REGISTER)[0];
    expect(registerOpts.method).toBe("POST");
    expect(JSON.parse(registerOpts.body)).toEqual({ username: "Yvan", email: "yvan@example.com", password: "motdepasse" });
    const [, loginOpts] = callsTo(API_ENDPOINTS.LOGIN)[0];
    expect(JSON.parse(loginOpts.body)).toEqual({ email: "yvan@example.com", password: "motdepasse" });
    expect(result.current.user).toEqual(USER);
  });

  it("appelle l'inscription avant la connexion", async () => {
    me = new Error("non connecté");
    const { result } = await renderAuth();
    await act(async () => { await result.current.register("A", "a@b.fr", "motdepasse"); });
    const order = h.request.mock.calls.map(([u]) => u).filter((u) => u === API_ENDPOINTS.REGISTER || u === API_ENDPOINTS.LOGIN);
    expect(order).toEqual([API_ENDPOINTS.REGISTER, API_ENDPOINTS.LOGIN]);
  });

  it("ne tente pas de connexion et relance l'erreur quand l'inscription échoue", async () => {
    me = new Error("non connecté");
    const failure = Object.assign(new Error("Cet email est déjà utilisé"), { status: 400 });
    routes({ [API_ENDPOINTS.REGISTER]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.register("A", "a@b.fr", "motdepasse"); })).rejects.toBe(failure);
    expect(callsTo(API_ENDPOINTS.LOGIN)).toHaveLength(0);
    expect(result.current.user).toBeNull();
  });

  it("relance l'erreur de connexion automatique", async () => {
    me = new Error("non connecté");
    const failure = new Error("login KO");
    routes({ [API_ENDPOINTS.LOGIN]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.register("A", "a@b.fr", "motdepasse"); })).rejects.toBe(failure);
  });
});

describe("AuthProvider – logout", () => {
  it("appelle /auth/logout, efface l'utilisateur et redirige vers l'accueil", async () => {
    const { result } = await renderAuth();
    await act(async () => { await result.current.logout(); });
    expect(callsTo(API_ENDPOINTS.LOGOUT)[0][1]).toEqual({ method: "POST" });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("déconnecte quand même l'utilisateur si l'appel échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    routes({ [API_ENDPOINTS.LOGOUT]: () => { throw new Error("réseau"); } });
    const { result } = await renderAuth();
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("journalise l'erreur de déconnexion sans la relancer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    routes({ [API_ENDPOINTS.LOGOUT]: () => { throw new Error("réseau"); } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.logout(); })).resolves.not.toThrow();
    expect(log).toHaveBeenCalled();
  });
});

describe("AuthProvider – updateUserProfile", () => {
  it("envoie les modifications en PATCH puis recharge l'utilisateur", async () => {
    const { result } = await renderAuth();
    me = { ...USER, user_name: "Nouveau" };
    await act(async () => { await result.current.updateUserProfile({ username: "Nouveau" }); });
    const [, opts] = callsTo(API_ENDPOINTS.EDIT_INFOS)[0];
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body)).toEqual({ username: "Nouveau" });
    expect(result.current.user?.user_name).toBe("Nouveau");
  });

  it("relance l'erreur et ne recharge pas l'utilisateur quand la mise à jour échoue", async () => {
    const failure = Object.assign(new Error("Email déjà utilisé"), { status: 400 });
    routes({ [API_ENDPOINTS.EDIT_INFOS]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.updateUserProfile({ email: "x@y.fr" }); })).rejects.toBe(failure);
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(1);
    expect(result.current.user).toEqual(USER);
  });
});

describe("AuthProvider – loginSpotify", () => {
  const realLocation = window.location;
  afterEach(() => { Object.defineProperty(window, "location", { value: realLocation, writable: true }); });

  it("redirige le navigateur vers la connexion Spotify du backend", async () => {
    Object.defineProperty(window, "location", { value: { href: "http://localhost/auth" }, writable: true });
    const { result } = await renderAuth();
    act(() => result.current.loginSpotify());
    expect(window.location.href).toBe(API_ENDPOINTS.SPOTIFY_LOGIN);
  });

  it("n'appelle pas l'API (c'est une redirection complète, pas un fetch)", async () => {
    Object.defineProperty(window, "location", { value: { href: "" }, writable: true });
    const { result } = await renderAuth();
    const before = h.request.mock.calls.length;
    act(() => result.current.loginSpotify());
    expect(h.request.mock.calls.length).toBe(before);
  });
});

describe("AuthProvider – deleteAccount", () => {
  it("supprime le compte, efface l'utilisateur et redirige vers l'accueil", async () => {
    const { result } = await renderAuth();
    await act(async () => { await result.current.deleteAccount(); });
    expect(callsTo(API_ENDPOINTS.DELETE_ACCOUNT)[0][1]).toEqual({ method: "DELETE" });
    expect(result.current.user).toBeNull();
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("relance l'erreur et garde l'utilisateur quand la suppression échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(new Error("boom"), { status: 500 });
    routes({ [API_ENDPOINTS.DELETE_ACCOUNT]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.deleteAccount(); })).rejects.toBe(failure);
    expect(result.current.user).toEqual(USER);
    expect(h.push).not.toHaveBeenCalled();
  });

  it("déconnecte et redirige sur un 401 (session expirée ou compte déjà supprimé), puis relance l'erreur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(new Error("Non connecté"), { status: 401 });
    routes({ [API_ENDPOINTS.DELETE_ACCOUNT]: () => { throw failure; } });
    const { result } = await renderAuth();
    // L'erreur est interceptée dans l'act : React ignore les mises à jour d'état d'un act qui lève
    let caught: unknown;
    await act(async () => {
      try { await result.current.deleteAccount(); } catch (e) { caught = e; }
    });
    expect(caught).toBe(failure);
    expect(result.current.user).toBeNull();
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("journalise l'erreur de suppression", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    routes({ [API_ENDPOINTS.DELETE_ACCOUNT]: () => { throw new Error("boom"); } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.deleteAccount(); })).rejects.toThrow();
    expect(log).toHaveBeenCalled();
  });
});

describe("AuthProvider – clearAccount", () => {
  it("efface les données puis recharge l'utilisateur", async () => {
    const { result } = await renderAuth();
    await act(async () => { await result.current.clearAccount(); });
    expect(callsTo(API_ENDPOINTS.CLEAR_ACCOUNT)[0][1]).toEqual({ method: "DELETE" });
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(2);
    expect(result.current.user).toEqual(USER);
  });

  it("garde l'utilisateur connecté (le compte n'est pas supprimé)", async () => {
    const { result } = await renderAuth();
    await act(async () => { await result.current.clearAccount(); });
    expect(result.current.isLoggedIn).toBe(true);
    expect(callsTo(API_ENDPOINTS.DELETE_ACCOUNT)).toHaveLength(0);
    expect(h.push).not.toHaveBeenCalled();
  });

  it("relance l'erreur et ne recharge pas l'utilisateur quand le nettoyage échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    routes({ [API_ENDPOINTS.CLEAR_ACCOUNT]: () => { throw failure; } });
    const { result } = await renderAuth();
    await expect(act(async () => { await result.current.clearAccount(); })).rejects.toBe(failure);
    expect(callsTo(API_ENDPOINTS.ME)).toHaveLength(1);
  });
});

describe("AuthProvider – valeur exposée", () => {
  it("expose toutes les actions attendues", async () => {
    const { result } = await renderAuth();
    for (const key of ["login", "register", "logout", "refreshUser", "updateUserProfile", "loginSpotify", "deleteAccount", "clearAccount"] as const) {
      expect(typeof result.current[key]).toBe("function");
    }
  });

  it("dérive isLoggedIn de la présence de l'utilisateur", async () => {
    const { result } = await renderAuth();
    expect(result.current.isLoggedIn).toBe(true);
    await act(async () => { await result.current.logout(); });
    expect(result.current.isLoggedIn).toBe(false);
  });
});
