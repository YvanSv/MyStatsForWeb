/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MergeEntityType, MergeStatus, MusicProvider, useApiAdmin } from "./action";
import { API_ENDPOINTS } from "../constants/routes";

const h = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../services/api", () => ({ apiRequest: h.apiRequest }));

beforeEach(() => {
  h.apiRequest.mockReset();
  h.apiRequest.mockResolvedValue({ ok: true });
});

describe("enums", () => {
  it("expose les valeurs attendues", () => {
    expect(MusicProvider).toEqual({ SPOTIFY: "SPOTIFY", APPLE_MUSIC: "APPLE_MUSIC", ISRC: "ISRC", MUSICBRAINZ: "MUSICBRAINZ" });
    expect(MergeEntityType).toEqual({ ARTIST: "ARTIST", ALBUM: "ALBUM", TRACK: "TRACK" });
    expect(MergeStatus).toEqual({ PENDING: "PENDING", COMPLETED: "COMPLETED", REJECTED: "REJECTED" });
  });
});

describe("useApiAdmin", () => {
  it("expose les fonctions et loading=false au départ", () => {
    const { result } = renderHook(() => useApiAdmin());
    expect(result.current.loading).toBe(false);
    for (const k of ["getTracksError", "updateTrack", "getMergeRequests", "getCreateRequests", "getCreateRequestById", "resolveCreateRequest"] as const) {
      expect(typeof result.current[k]).toBe("function");
    }
  });

  it("expose aussi resolveMergeRequest", () => {
    const { result } = renderHook(() => useApiAdmin());
    expect(typeof (result.current as any).resolveMergeRequest).toBe("function");
  });

  it("garde des références stables entre rendus", () => {
    const { result, rerender } = renderHook(() => useApiAdmin());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("getTracksError appelle l'endpoint ERRORS et renvoie la réponse", async () => {
    h.apiRequest.mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useApiAdmin());
    let res: unknown;
    await act(async () => { res = await result.current.getTracksError(); });
    expect(h.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.ERRORS, undefined);
    expect(res).toEqual([{ id: 1 }]);
  });

  it("getMergeRequests appelle l'endpoint MERGE_REQUESTS", async () => {
    h.apiRequest.mockResolvedValue([]);
    const { result } = renderHook(() => useApiAdmin());
    let res: unknown;
    await act(async () => { res = await result.current.getMergeRequests(); });
    expect(h.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.MERGE_REQUESTS, undefined);
    expect(res).toEqual([]);
  });

  it("getCreateRequests appelle l'endpoint CREATE_REQUESTS", async () => {
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await result.current.getCreateRequests(); });
    expect(h.apiRequest).toHaveBeenCalledWith(API_ENDPOINTS.CREATE_REQUESTS, undefined);
  });

  it("getCreateRequestById ajoute l'id à l'URL", async () => {
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await result.current.getCreateRequestById(42); });
    expect(h.apiRequest).toHaveBeenCalledWith(`${API_ENDPOINTS.CREATE_REQUESTS}/42`, undefined);
  });

  it("propage les erreurs de getTracksError", async () => {
    h.apiRequest.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => {
      await expect(result.current.getTracksError()).rejects.toThrow("boom");
    });
    expect(result.current.loading).toBe(false);
  });

  it("updateTrack envoie un POST JSON sur ERRORS", async () => {
    const track = { id: 3, duration_ms: 1000, title: "t", album_name: "a", artist_name: "x", history: [{ id: 1, ms_played: 500 }] };
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await result.current.updateTrack(track); });
    expect(h.apiRequest).toHaveBeenCalledTimes(1);
    const [url, opts] = h.apiRequest.mock.calls[0];
    expect(url).toBe(API_ENDPOINTS.ERRORS);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(track);
  });

  it("updateTrack renvoie une promesse qui rejette si l'API échoue (sinon l'appelant affiche un faux succès)", async () => {
    h.apiRequest.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useApiAdmin());
    let outcome: unknown = "unset";
    await act(async () => {
      try { await result.current.updateTrack({ id: 1, duration_ms: 1, title: "", album_name: "", artist_name: "", history: [] }); outcome = "resolved"; }
      catch { outcome = "rejected"; }
    });
    expect(outcome).toBe("rejected");
  });

  it("resolveCreateRequest envoie approve, master_index et selected_isrcs", async () => {
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await result.current.resolveCreateRequest(7, true, 2, ["A", "B"]); });
    const [url, opts] = h.apiRequest.mock.calls[0];
    expect(url).toBe(`${API_ENDPOINTS.CREATE_REQUESTS}/7/resolve`);
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opts.body)).toEqual({ approve: true, master_index: 2, selected_isrcs: ["A", "B"] });
  });

  it("resolveCreateRequest gère un rejet avec liste vide et index 0", async () => {
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await result.current.resolveCreateRequest(1, false, 0, []); });
    expect(JSON.parse(h.apiRequest.mock.calls[0][1].body)).toEqual({ approve: false, master_index: 0, selected_isrcs: [] });
  });

  it("resolveCreateRequest renvoie une promesse qui rejette si l'API échoue", async () => {
    h.apiRequest.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useApiAdmin());
    let outcome = "unset";
    await act(async () => {
      try { await result.current.resolveCreateRequest(1, true, 0, []); outcome = "resolved"; }
      catch { outcome = "rejected"; }
    });
    expect(outcome).toBe("rejected");
  });

  it("resolveMergeRequest envoie { approve } en POST JSON", async () => {
    const { result } = renderHook(() => useApiAdmin());
    await act(async () => { await (result.current as any).resolveMergeRequest?.(5, false); });
    expect(h.apiRequest).toHaveBeenCalledTimes(1);
    const [url, opts] = h.apiRequest.mock.calls[0];
    expect(url).toBe(`${API_ENDPOINTS.MERGE_REQUESTS}/5/resolve`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ approve: false });
  });

  it("loading passe à true pendant la requête puis retombe à false", async () => {
    let resolve!: (v: unknown) => void;
    h.apiRequest.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useApiAdmin());
    let p!: Promise<unknown>;
    act(() => { p = result.current.getTracksError(); });
    expect(result.current.loading).toBe(true);
    await act(async () => { resolve([]); await p; });
    expect(result.current.loading).toBe(false);
  });
});
