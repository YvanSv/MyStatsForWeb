/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { API_ENDPOINTS } from "../constants/routes";
import { useApiAllDatas } from "./useApiAllDatas";
import { useApiMyDatas } from "./useApiMyDatas";

const h = vi.hoisted(() => ({ request: vi.fn() }));
const useApiMock = vi.hoisted(() => vi.fn());
vi.mock("./useApi", () => ({ useApi: () => useApiMock() }));

const parse = (url: string) => {
  const [base, qs] = url.split("?");
  return { base, params: new URLSearchParams(qs) };
};

beforeEach(() => {
  useApiMock.mockReset();
  useApiMock.mockImplementation(() => ({ loading: false, request: h.request }));
  h.request.mockReset();
  h.request.mockResolvedValue([]);
});

describe.each([
  {
    name: "useApiAllDatas",
    use: useApiAllDatas,
    lists: { getTracks: API_ENDPOINTS.ALL_TRACKS, getArtists: API_ENDPOINTS.ALL_ARTISTS, getAlbums: API_ENDPOINTS.ALL_ALBUMS },
    metas: {
      getTracksMetadata: API_ENDPOINTS.ALL_TRACKS_METADATA,
      getArtistsMetadata: API_ENDPOINTS.ALL_ARTISTS_METADATA,
      getAlbumsMetadata: API_ENDPOINTS.ALL_ALBUMS_METADATA,
      getHomeData: API_ENDPOINTS.HOME_DATA,
    },
  },
  {
    name: "useApiMyDatas",
    use: useApiMyDatas,
    lists: { getTracks: API_ENDPOINTS.TRACKS, getArtists: API_ENDPOINTS.ARTISTS, getAlbums: API_ENDPOINTS.ALBUMS },
    metas: {
      getTracksMetadata: API_ENDPOINTS.TRACKS_METADATA,
      getArtistsMetadata: API_ENDPOINTS.ARTISTS_METADATA,
      getAlbumsMetadata: API_ENDPOINTS.ALBUMS_METADATA,
      refreshUserData: API_ENDPOINTS.REFRESH_USER_DATA,
      getTodayStats: API_ENDPOINTS.TODAY_STATS,
    },
  },
])("$name", ({ use, lists, metas }) => {
  describe.each(Object.entries(lists))("%s", (fn, endpoint) => {
    const call = async (filters?: Record<string, unknown>) => {
      const { result } = renderHook(() => use());
      await (result.current as any)[fn](filters);
      return parse(h.request.mock.calls[0][0]);
    };

    it("appelle le bon endpoint avec les paramètres par défaut", async () => {
      const { base, params } = await call();
      expect(base).toBe(endpoint);
      expect(Object.fromEntries(params)).toEqual({ offset: "0", limit: "50", sort: "play_count", direction: "desc" });
    });

    it("ajoute les filtres fournis et laisse les valeurs fournies l'emporter sur les défauts", async () => {
      const { params } = await call({ sort: "rating", direction: "asc", offset: 100, artist: "Daft Punk" });
      expect(Object.fromEntries(params)).toEqual({
        offset: "100", limit: "50", sort: "rating", direction: "asc", artist: "Daft Punk",
      });
    });

    it("ignore les filtres undefined, null et vides mais garde 0 et false", async () => {
      const { params } = await call({ a: undefined, b: null, c: "", d: 0, e: false });
      expect(params.has("a") || params.has("b") || params.has("c")).toBe(false);
      expect(params.get("d")).toBe("0");
      expect(params.get("e")).toBe("false");
    });

    it("encode les caractères spéciaux", async () => {
      const { params } = await call({ track: "a&b=c d" });
      expect(params.get("track")).toBe("a&b=c d");
    });

    it("renvoie la réponse de la requête", async () => {
      h.request.mockResolvedValue([{ id: 1 }]);
      const { result } = renderHook(() => use());
      await expect((result.current as any)[fn]()).resolves.toEqual([{ id: 1 }]);
    });
  });

  describe.each(Object.entries(metas))("%s", (fn, endpoint) => {
    it("appelle l'endpoint sans paramètre", async () => {
      const { result } = renderHook(() => use());
      await (result.current as any)[fn]();
      expect(h.request).toHaveBeenCalledWith(endpoint);
    });
  });

  it("expose loading et garde des fonctions stables entre rendus", () => {
    const { result, rerender } = renderHook(() => use());
    const first = result.current;
    rerender();
    expect(result.current.loading).toBe(false);
    expect(result.current).toBe(first);
  });
});

describe("useApiMyDatas.getResumeStats", () => {
  it("appelle l'endpoint de résumé avec les paramètres construits", async () => {
    const { result } = renderHook(() => useApiMyDatas());
    await result.current.getResumeStats({ range: "year", offset: 1, sort: "streams" });
    const { base, params } = parse(h.request.mock.calls[0][0]);
    expect(base).toBe(API_ENDPOINTS.SHARE);
    expect(Object.fromEntries(params)).toEqual({
      offset: "1", limit: "50", range: "year", sort: "streams", direction: "desc",
    });
  });

  it("fonctionne sans filtres", async () => {
    const { result } = renderHook(() => useApiMyDatas());
    await result.current.getResumeStats();
    expect(parse(h.request.mock.calls[0][0]).base).toBe(API_ENDPOINTS.SHARE);
  });
});

describe("useApiMyDatas - dépendances des callbacks", () => {
  it("getResumeStats utilise le request courant quand il change", async () => {
    const r1 = vi.fn().mockResolvedValue("a");
    const r2 = vi.fn().mockResolvedValue("b");
    const cur = { request: r1 };
    useApiMock.mockImplementation(() => ({ loading: false, request: cur.request }));
    const { result, rerender } = renderHook(() => useApiMyDatas());
    const first = result.current.getResumeStats;
    cur.request = r2;
    rerender();
    expect(result.current.getResumeStats).not.toBe(first);
    await result.current.getResumeStats();
    expect(r2).toHaveBeenCalledTimes(1);
    expect(r1).not.toHaveBeenCalled();
  });

  it("toutes les fonctions restent stables entre rendus tant que request ne change pas", () => {
    const { result, rerender } = renderHook(() => useApiMyDatas());
    const first = { ...result.current };
    rerender();
    rerender();
    for (const [k, v] of Object.entries(first)) {
      expect((result.current as any)[k], k).toBe(v);
    }
  });
});
