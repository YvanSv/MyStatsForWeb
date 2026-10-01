import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApiUploadData } from "./useApiUploadData";

const h = vi.hoisted(() => ({ request: vi.fn(), loading: false }));
vi.mock("./useApi", () => ({ useApi: () => ({ loading: h.loading, request: h.request }) }));

beforeEach(() => {
  h.request.mockReset();
  h.request.mockResolvedValue({ status: "ok" });
  h.loading = false;
});

describe("useApiUploadData", () => {
  it("uploadSpotifyJson envoie tous les fichiers dans un FormData sous la clé 'files'", async () => {
    const f1 = new File(["[]"], "a.json", { type: "application/json" });
    const f2 = new File(["[]"], "b.json", { type: "application/json" });
    const { result } = renderHook(() => useApiUploadData());
    const res = await result.current.uploadSpotifyJson([f1, f2]);
    expect(res).toEqual({ status: "ok" });
    const [endpoint, options] = h.request.mock.calls[0];
    expect(endpoint).toBe(API_ENDPOINTS.SPOTIFY_IMPORT);
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.getAll("files")).toEqual([f1, f2]);
  });

  it("uploadSpotifyJson sans fichier envoie un FormData vide", async () => {
    const { result } = renderHook(() => useApiUploadData());
    await result.current.uploadSpotifyJson([]);
    expect(h.request.mock.calls[0][1].body.getAll("files")).toEqual([]);
  });

  it("n'impose pas de Content-Type pour le FormData (le navigateur ajoute la boundary)", async () => {
    const { result } = renderHook(() => useApiUploadData());
    await result.current.uploadSpotifyJson([new File(["x"], "a.json")]);
    expect(h.request.mock.calls[0][1].headers).toBeUndefined();
  });

  it("uploadAppleJson envoie la liste en JSON vers l'endpoint Apple", async () => {
    const rows = [{ title: "T", artist: "A" }] as never[];
    const { result } = renderHook(() => useApiUploadData());
    await result.current.uploadAppleJson(rows);
    const [endpoint, options] = h.request.mock.calls[0];
    expect(endpoint).toBe(API_ENDPOINTS.APPLE_IMPORT);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(rows);
  });

  it("propage les erreurs de la requête", async () => {
    h.request.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useApiUploadData());
    await expect(result.current.uploadSpotifyJson([])).rejects.toThrow("boom");
    await expect(result.current.uploadAppleJson([])).rejects.toThrow("boom");
  });

  it("expose l'état loading de useApi", () => {
    h.loading = true;
    const { result } = renderHook(() => useApiUploadData());
    expect(result.current.loading).toBe(true);
  });
});
