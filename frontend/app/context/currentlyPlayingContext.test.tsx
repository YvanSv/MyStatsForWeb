import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { API_ENDPOINTS } from "../constants/routes";
import { SpotifyProvider, useSpotify } from "./currentlyPlayingContext";

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  request: vi.fn(),
  isLoggedIn: true,
  lang: "fr" as "fr" | "en",
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../hooks/useApi", () => ({ useApi: () => ({ request: h.request }) }));
vi.mock("./authContext", () => ({ useAuth: () => ({ isLoggedIn: h.isLoggedIn }) }));
vi.mock("react-hot-toast", () => ({ default: h.toast }));
vi.mock("./languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[h.lang], language: h.lang, changeLanguage: vi.fn() }) };
});

// --- Helpers ---------------------------------------------------------------

const dict = languages.fr.api;

const track = (over: Partial<Record<string, unknown>> = {}) => ({
  title: "Marché noir", progress_ms: 30000, duration_ms: 200000,
  album_name: "Marché noir", artist_name: "SCH", cover_url: "https://img/c.jpg", ...over,
});
const PLAYING = { is_listening: true, data: track() };
const NOTHING = { is_listening: false, data: null };

const wrapper = ({ children }: { children: React.ReactNode }) => <SpotifyProvider>{children}</SpotifyProvider>;

let response: unknown;
const callsTo = (url: string) => h.request.mock.calls.filter(([u]) => u === url);
const currentCalls = () => callsTo(API_ENDPOINTS.CURRENTLY_PLAYING).length;

/** Monte le provider et laisse passer la requête initiale. */
const mount = async () => {
  const utils = renderHook(() => useSpotify(), { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  return utils;
};
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  h.isLoggedIn = true;
  h.lang = "fr";
  response = PLAYING;
  h.request.mockImplementation(async (url: string) => {
    if (url === API_ENDPOINTS.CURRENTLY_PLAYING) {
      if (response instanceof Error) throw response;
      return response;
    }
    return {};
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// --- Tests -----------------------------------------------------------------

describe("useSpotify", () => {
  it("lève une erreur explicite hors du SpotifyProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSpotify())).toThrow(`useSpotify ${languages.fr.context.template} SpotifyProvider`);
  });
});

describe("SpotifyProvider – démarrage", () => {
  it("interroge la lecture en cours au montage quand l'utilisateur est connecté", async () => {
    await mount();
    expect(currentCalls()).toBe(1);
  });

  it("n'interroge pas l'API quand l'utilisateur est déconnecté", async () => {
    h.isLoggedIn = false;
    await mount();
    await tick(45000);
    expect(h.request).not.toHaveBeenCalled();
  });

  it("commence à interroger l'API dès que l'utilisateur se connecte (après le montage)", async () => {
    h.isLoggedIn = false;
    const { rerender, result } = await mount();
    expect(currentCalls()).toBe(0);

    h.isLoggedIn = true;
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(currentCalls()).toBeGreaterThanOrEqual(1);
    expect(result.current.listening.data?.title).toBe("Marché noir");
  });

  it("arrête d'interroger l'API quand l'utilisateur se déconnecte", async () => {
    const { rerender } = await mount();
    h.isLoggedIn = false;
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const before = currentCalls();
    await tick(45000);
    expect(currentCalls()).toBe(before);
  });

  it("expose un état initial vide et en pause tant qu'aucune réponse n'est arrivée", () => {
    h.request.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSpotify(), { wrapper });
    expect(result.current.listening).toEqual({ is_listening: false, data: null });
    expect(result.current.localProgress).toBe(0);
    expect(result.current.isPaused).toBe(true);
  });
});

describe("SpotifyProvider – réponses de l'API", () => {
  it("enregistre la lecture en cours et sa progression", async () => {
    const { result } = await mount();
    expect(result.current.listening).toEqual(PLAYING);
    expect(result.current.localProgress).toBe(30000);
  });

  it("n'est pas en pause quand un morceau est en cours de lecture", async () => {
    const { result } = await mount();
    expect(result.current.isPaused).toBe(false);
  });

  it("passe en pause quand la lecture s'arrête, en gardant le dernier morceau affiché", async () => {
    const { result } = await mount();
    response = NOTHING;
    await tick(15000);
    expect(result.current.listening.is_listening).toBe(false);
    expect(result.current.listening.data?.title).toBe("Marché noir");
    expect(result.current.isPaused).toBe(true);
  });

  it.each([[null], [undefined], [NOTHING]])("traite la réponse %j comme une lecture arrêtée", async (res) => {
    response = res;
    const { result } = await mount();
    expect(result.current.listening.is_listening).toBe(false);
    expect(result.current.isPaused).toBe(true);
    expect(result.current.listening.data).toBeNull();
  });

  it("reprend la lecture au morceau suivant (nouvelle réponse avec données)", async () => {
    const { result } = await mount();
    response = { is_listening: true, data: track({ title: "Autre", progress_ms: 5000 }) };
    await tick(15000);
    expect(result.current.listening.data?.title).toBe("Autre");
    // Le sondage et le tick d'une seconde tombent au même instant : tolérance d'un tick
    expect(result.current.localProgress).toBeGreaterThanOrEqual(5000);
    expect(result.current.localProgress).toBeLessThanOrEqual(6000);
    expect(result.current.isPaused).toBe(false);
  });

  it("journalise l'erreur et conserve l'état précédent quand l'API échoue", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = await mount();
    response = new Error("réseau");
    await tick(15000);
    expect(log).toHaveBeenCalled();
    expect(result.current.listening).toEqual(PLAYING);
  });

  it("fetchCurrent interroge l'API à la demande", async () => {
    const { result } = await mount();
    const before = currentCalls();
    await act(async () => { await result.current.fetchCurrent(); });
    expect(currentCalls()).toBe(before + 1);
  });
});

describe("SpotifyProvider – interrogation périodique", () => {
  it("interroge l'API toutes les 15 secondes", async () => {
    await mount();
    expect(currentCalls()).toBe(1);
    await tick(14999);
    expect(currentCalls()).toBe(1);
    await tick(1);
    expect(currentCalls()).toBe(2);
    await tick(15000);
    expect(currentCalls()).toBe(3);
  });

  it("arrête l'interrogation au démontage", async () => {
    const { unmount } = await mount();
    unmount();
    const before = currentCalls();
    await tick(60000);
    expect(currentCalls()).toBe(before);
  });
});

describe("SpotifyProvider – progression locale", () => {
  it("avance d'une seconde par seconde pendant la lecture", async () => {
    const { result } = await mount();
    await tick(3000);
    expect(result.current.localProgress).toBe(33000);
  });

  it("n'avance pas quand rien n'est en lecture", async () => {
    response = NOTHING;
    const { result } = await mount();
    await tick(5000);
    expect(result.current.localProgress).toBe(0);
  });

  it("s'arrête quand la lecture s'arrête", async () => {
    const { result } = await mount();
    await tick(2000);
    response = NOTHING;
    await tick(13000); // prochain sondage à 15 s
    const frozen = result.current.localProgress;
    await tick(5000);
    expect(result.current.localProgress).toBe(frozen);
  });

  it("redemande la lecture en cours à la fin du morceau, sans dépasser la durée", async () => {
    response = { is_listening: true, data: track({ progress_ms: 198000, duration_ms: 200000 }) };
    const { result } = await mount();
    const before = currentCalls();
    await tick(1000);
    expect(result.current.localProgress).toBe(199000);
    await tick(1000); // 200000 >= durée -> rafraîchissement
    expect(currentCalls()).toBeGreaterThan(before);
    expect(result.current.localProgress).toBeLessThanOrEqual(200000);
  });

  it("se recale sur la progression renvoyée par l'API", async () => {
    const { result } = await mount();
    await tick(10000);
    response = { is_listening: true, data: track({ progress_ms: 90000 }) };
    await tick(5000); // sondage à 15 s
    // Recalé sur 90 000 ms (à un tick près), et non sur ~45 000 ms comme sans recalage
    expect(result.current.localProgress).toBeGreaterThanOrEqual(90000);
    expect(result.current.localProgress).toBeLessThanOrEqual(91000);
  });
});

describe("SpotifyProvider – contrôles de lecture", () => {
  it("pause : appelle PUT /pause, passe en pause et redemande l'état après 500 ms", async () => {
    const { result } = await mount();
    await act(async () => { await result.current.pause(); });
    expect(callsTo(API_ENDPOINTS.PAUSE)[0][1]).toEqual({ method: "PUT" });
    expect(result.current.listening.is_listening).toBe(false);
    expect(result.current.isPaused).toBe(true);

    const before = currentCalls();
    await tick(499);
    expect(currentCalls()).toBe(before);
    await tick(1);
    expect(currentCalls()).toBe(before + 1);
  });

  it("pause : garde le morceau affiché", async () => {
    const { result } = await mount();
    await act(async () => { await result.current.pause(); });
    expect(result.current.listening.data?.title).toBe("Marché noir");
  });

  it("resume : appelle PUT /resume, repasse en lecture et redemande l'état", async () => {
    response = NOTHING;
    const { result } = await mount();
    const before = currentCalls();
    await act(async () => { await result.current.resume(); });
    expect(callsTo(API_ENDPOINTS.RESUME)[0][1]).toEqual({ method: "PUT" });
    expect(result.current.listening.is_listening).toBe(true);
    expect(result.current.isPaused).toBe(false);
    await tick(500);
    expect(currentCalls()).toBe(before + 1);
  });

  it("next : appelle POST /next et redemande l'état après 500 ms", async () => {
    const { result } = await mount();
    await act(async () => { await result.current.next(); });
    expect(callsTo(API_ENDPOINTS.NEXT)[0][1]).toEqual({ method: "POST" });
    const before = currentCalls();
    await tick(500);
    expect(currentCalls()).toBe(before + 1);
  });

  it("previous : appelle POST /previous et redemande l'état après 500 ms", async () => {
    const { result } = await mount();
    await act(async () => { await result.current.previous(); });
    expect(callsTo(API_ENDPOINTS.PREVIOUS)[0][1]).toEqual({ method: "POST" });
    const before = currentCalls();
    await tick(500);
    expect(currentCalls()).toBe(before + 1);
  });

  it("next et previous ne changent pas l'état de lecture immédiatement", async () => {
    const { result } = await mount();
    await act(async () => { await result.current.next(); await result.current.previous(); });
    expect(result.current.listening).toEqual(PLAYING);
    expect(result.current.isPaused).toBe(false);
  });
});

describe("SpotifyProvider – erreurs des contrôles", () => {
  const failWith = (err: unknown) => {
    h.request.mockImplementation(async (url: string) => {
      if (url === API_ENDPOINTS.CURRENTLY_PLAYING) return PLAYING;
      throw err;
    });
  };
  const actions = ["pause", "resume", "next", "previous"] as const;

  it.each(actions)("%s : affiche « Premium requis » sur un 403", async (action) => {
    failWith(Object.assign(new Error("403"), { status: 403 }));
    const { result } = await mount();
    await act(async () => { await result.current[action](); });
    expect(h.toast.error).toHaveBeenCalledWith(dict.spotifyPremiumRequired, { duration: 5000 });
  });

  it.each(actions)("%s : affiche « Aucun appareil actif » sur un 404", async (action) => {
    failWith(Object.assign(new Error("404"), { status: 404 }));
    const { result } = await mount();
    await act(async () => { await result.current[action](); });
    expect(h.toast.error).toHaveBeenCalledWith(dict.spotifyNoDevice);
  });

  it.each([[500], [429], [502], [undefined]])("affiche l'erreur générique pour le statut %s", async (status) => {
    failWith(Object.assign(new Error("boom"), { status }));
    const { result } = await mount();
    await act(async () => { await result.current.pause(); });
    expect(h.toast.error).toHaveBeenCalledWith(dict.spotifyError);
  });

  it("lit aussi le statut dans error.response.status", async () => {
    failWith(Object.assign(new Error("403"), { response: { status: 403 } }));
    const { result } = await mount();
    await act(async () => { await result.current.next(); });
    expect(h.toast.error).toHaveBeenCalledWith(dict.spotifyPremiumRequired, { duration: 5000 });
  });

  it("affiche l'erreur générique quand l'erreur n'a aucune information de statut", async () => {
    failWith(new Error("réseau"));
    const { result } = await mount();
    await act(async () => { await result.current.resume(); });
    expect(h.toast.error).toHaveBeenCalledWith(dict.spotifyError);
  });

  it.each([
    [403, languages.en.api.spotifyPremiumRequired],
    [404, languages.en.api.spotifyNoDevice],
    [500, languages.en.api.spotifyError],
  ])("affiche les messages dans la langue choisie (en, statut %i)", async (status, message) => {
    h.lang = "en";
    failWith(Object.assign(new Error("x"), { status }));
    const { result } = await mount();
    await act(async () => { await result.current.pause(); });
    expect(h.toast.error.mock.calls[0][0]).toBe(message);
    expect(message).not.toBe(languages.fr.api.spotifyError);
  });

  it("pause en échec : l'état de lecture ne change pas", async () => {
    failWith(Object.assign(new Error("403"), { status: 403 }));
    const { result } = await mount();
    await act(async () => { await result.current.pause(); });
    expect(result.current.listening).toEqual(PLAYING);
    expect(result.current.isPaused).toBe(false);
  });

  it("resume en échec : reste en pause", async () => {
    response = NOTHING;
    failWith(Object.assign(new Error("404"), { status: 404 }));
    h.request.mockImplementation(async (url: string) => {
      if (url === API_ENDPOINTS.CURRENTLY_PLAYING) return NOTHING;
      throw Object.assign(new Error("404"), { status: 404 });
    });
    const { result } = await mount();
    await act(async () => { await result.current.resume(); });
    expect(result.current.listening.is_listening).toBe(false);
    expect(result.current.isPaused).toBe(true);
  });

  it("ne redemande pas l'état après une action en échec", async () => {
    failWith(Object.assign(new Error("403"), { status: 403 }));
    const { result } = await mount();
    const before = currentCalls();
    await act(async () => { await result.current.next(); });
    await tick(500);
    expect(currentCalls()).toBe(before);
  });

  it("ne propage aucune exception à l'appelant", async () => {
    failWith(new Error("boom"));
    const { result } = await mount();
    await expect(act(async () => { await result.current.pause(); })).resolves.not.toThrow();
  });
});

describe("SpotifyProvider – valeur exposée", () => {
  it("expose toutes les actions attendues", async () => {
    const { result } = await mount();
    for (const key of ["fetchCurrent", "pause", "resume", "next", "previous"] as const) {
      expect(typeof result.current[key]).toBe("function");
    }
  });
});
