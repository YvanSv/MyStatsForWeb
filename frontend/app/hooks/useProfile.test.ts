import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { API_ENDPOINTS } from "../constants/routes";
import { useProfile } from "./useProfile";

const h = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../services/api", () => ({ apiRequest: h.apiRequest }));

beforeEach(() => {
  h.apiRequest.mockReset();
  h.apiRequest.mockResolvedValue({ ok: true });
});

describe("useProfile", () => {
  it("getProfile appelle /profile/{id}", async () => {
    const { result } = renderHook(() => useProfile());
    await act(async () => { await result.current.getProfile("42"); });
    expect(h.apiRequest).toHaveBeenCalledWith(`${API_ENDPOINTS.PROFILE_DATA}/42`);
  });

  it("getTopDataProfile appelle /profile/tops/{id}", async () => {
    const { result } = renderHook(() => useProfile());
    await act(async () => { await result.current.getTopDataProfile("42"); });
    expect(h.apiRequest).toHaveBeenCalledWith(`${API_ENDPOINTS.PROFILE_DATA_TOPS}/42`);
  });

  it("getEditableProfile appelle /edit-profile/{id}", async () => {
    const { result } = renderHook(() => useProfile());
    await act(async () => { await result.current.getEditableProfile("me"); });
    expect(h.apiRequest).toHaveBeenCalledWith(`${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/me`);
  });

  it("patchProfile envoie un PATCH JSON", async () => {
    const { result } = renderHook(() => useProfile());
    await act(async () => { await result.current.patchProfile("7", { display_name: "Neo" } as never); });
    const [url, options] = h.apiRequest.mock.calls[0];
    expect(url).toBe(`${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/7`);
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ display_name: "Neo" });
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });

  describe("getDashboard", () => {
    const url = async (start: string | null, end: string | null) => {
      const { result } = renderHook(() => useProfile());
      await act(async () => { await result.current.getDashboard("5", start, end); });
      return h.apiRequest.mock.calls[0][0] as string;
    };

    it("sans dates : pas de query string", async () => {
      expect(await url(null, null)).toBe(`${API_ENDPOINTS.DASHBOARD_DATA}/5`);
    });

    it("avec les deux dates", async () => {
      expect(await url("2024-01-01", "2024-12-31")).toBe(
        `${API_ENDPOINTS.DASHBOARD_DATA}/5?start_date=2024-01-01&end_date=2024-12-31`,
      );
    });

    it("avec une seule date", async () => {
      expect(await url("2024-01-01", null)).toBe(`${API_ENDPOINTS.DASHBOARD_DATA}/5?start_date=2024-01-01`);
      h.apiRequest.mockClear();
      expect(await url(null, "2024-12-31")).toBe(`${API_ENDPOINTS.DASHBOARD_DATA}/5?end_date=2024-12-31`);
    });
  });

  it.each(["a/b", "x?y=1", "../admin"])("encode l'identifiant %j dans toutes les URL de profil", async (id) => {
    const { result } = renderHook(() => useProfile());
    await act(async () => {
      await result.current.getProfile(id);
      await result.current.getTopDataProfile(id);
      await result.current.getEditableProfile(id);
      await result.current.patchProfile(id, {});
      await result.current.getDashboard(id, null, null);
    });
    const encoded = encodeURIComponent(id);
    const urls = h.apiRequest.mock.calls.map((c) => c[0] as string);
    expect(urls).toEqual([
      `${API_ENDPOINTS.PROFILE_DATA}/${encoded}`,
      `${API_ENDPOINTS.PROFILE_DATA_TOPS}/${encoded}`,
      `${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/${encoded}`,
      `${API_ENDPOINTS.EDITABLE_PROFILE_DATA}/${encoded}`,
      `${API_ENDPOINTS.DASHBOARD_DATA}/${encoded}`,
    ]);
  });

  it("renvoie la réponse de l'API", async () => {
    h.apiRequest.mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useProfile());
    let res;
    await act(async () => { res = await result.current.getProfile("1"); });
    expect(res).toEqual({ id: 1 });
  });

  it("passe loading à true pendant l'appel puis à false", async () => {
    let resolve!: (v: unknown) => void;
    h.apiRequest.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useProfile());
    expect(result.current.loading).toBe(false);
    let p: Promise<unknown>;
    act(() => { p = result.current.getProfile("1"); });
    expect(result.current.loading).toBe(true);
    await act(async () => { resolve({}); await p; });
    expect(result.current.loading).toBe(false);
  });

  it("repasse loading à false et propage l'erreur en cas d'échec", async () => {
    h.apiRequest.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useProfile());
    await act(async () => {
      await expect(result.current.getProfile("1")).rejects.toThrow("boom");
      await expect(result.current.patchProfile("1", {})).rejects.toThrow("boom");
      await expect(result.current.getDashboard("1", null, null)).rejects.toThrow("boom");
    });
    expect(result.current.loading).toBe(false);
  });

  it("garde des fonctions stables entre rendus", () => {
    const { result, rerender } = renderHook(() => useProfile());
    const first = result.current;
    rerender();
    expect(result.current.getProfile).toBe(first.getProfile);
    expect(result.current.patchProfile).toBe(first.patchProfile);
  });
});
