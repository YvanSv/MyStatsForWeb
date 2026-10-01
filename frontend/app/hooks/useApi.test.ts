import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApi } from "./useApi";

const h = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../services/api", () => ({ apiRequest: h.apiRequest }));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe("useApi", () => {
  beforeEach(() => { h.apiRequest.mockReset(); });

  it("démarre avec loading=false", () => {
    const { result } = renderHook(() => useApi());
    expect(result.current.loading).toBe(false);
  });

  it("request transmet l'endpoint et les options à apiRequest et renvoie la réponse", async () => {
    h.apiRequest.mockResolvedValue({ ok: 1 });
    const { result } = renderHook(() => useApi());
    let res;
    await act(async () => { res = await result.current.request("/x", { method: "POST" }); });
    expect(res).toEqual({ ok: 1 });
    expect(h.apiRequest).toHaveBeenCalledWith("/x", { method: "POST" });
  });

  it("getSpotifyStatus appelle l'endpoint de statut Spotify", async () => {
    h.apiRequest.mockResolvedValue({ status: "active" });
    const { result } = renderHook(() => useApi());
    await act(async () => { await result.current.getSpotifyStatus(); });
    expect(h.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.SPOTIFY_STATUS, undefined);
  });

  it("passe loading à true pendant la requête puis à false", async () => {
    const d = deferred<string>();
    h.apiRequest.mockReturnValue(d.promise);
    const { result } = renderHook(() => useApi());
    let p: Promise<unknown>;
    act(() => { p = result.current.request("/x"); });
    expect(result.current.loading).toBe(true);
    await act(async () => { d.resolve("ok"); await p; });
    expect(result.current.loading).toBe(false);
  });

  it("repasse loading à false et propage l'erreur quand la requête échoue", async () => {
    const err = new Error("boom");
    h.apiRequest.mockRejectedValue(err);
    const { result } = renderHook(() => useApi());
    await act(async () => {
      await expect(result.current.request("/x")).rejects.toThrow("boom");
    });
    expect(result.current.loading).toBe(false);
  });

  it("reste loading=true tant qu'une autre requête est en cours (requêtes concurrentes)", async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    h.apiRequest.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { result } = renderHook(() => useApi());
    let pa: Promise<unknown>, pb: Promise<unknown>;
    act(() => {
      pa = result.current.request("/a");
      pb = result.current.request("/b");
    });
    await act(async () => { a.resolve("a"); await pa; });
    expect(result.current.loading).toBe(true);
    await act(async () => { b.resolve("b"); await pb; });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("garde des fonctions stables entre deux rendus", () => {
    const { result, rerender } = renderHook(() => useApi());
    const first = result.current;
    rerender();
    expect(result.current.request).toBe(first.request);
    expect(result.current.getSpotifyStatus).toBe(first.getSpotifyStatus);
  });
});
