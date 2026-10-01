import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRankingLogic } from "./useRankingLogic";

const h = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/my/tracks",
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
}));

const page = (n: number, start = 0) => Array.from({ length: n }, (_, i) => ({ id: start + i }));

const setup = (
  fetchFn = vi.fn().mockResolvedValue([]),
  metadataFn = vi.fn().mockResolvedValue(null),
  type: "track" | "album" | "artist" = "track",
) => ({
  fetchFn,
  metadataFn,
  ...renderHook(({ f, m }) => useRankingLogic(f, m, type), { initialProps: { f: fetchFn, m: metadataFn } }),
});

beforeEach(() => {
  h.push.mockReset();
  h.pathname = "/my/tracks";
  h.search = "";
});
afterEach(() => vi.useRealTimers());

describe("useRankingLogic – chargement", () => {
  it("charge la première page au montage avec les filtres par défaut", async () => {
    const { fetchFn, result } = setup(vi.fn().mockResolvedValue(page(3)));
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    const args = fetchFn.mock.calls[0][0];
    expect(args).toMatchObject({
      sort: "play_count", direction: "desc", offset: 0, limit: 50,
      track: "", artist: "", album: "",
      streams_min: "0", minutes_min: "0", engagement_min: "0", rating_min: "0",
    });
    expect(args.streams_max).toBeUndefined();
    expect(args.rating_max).toBeUndefined();
  });

  it("lit les filtres depuis l'URL", async () => {
    h.search = "sort=rating&direction=asc&artist=Daft&streams_min=5&streams_max=100&date_min=2020-01-01&date_max=2021-02-03";
    const { fetchFn } = setup();
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(fetchFn.mock.calls[0][0]).toMatchObject({
      sort: "rating", direction: "asc", artist: "Daft", streams_min: "5", streams_max: "100",
      date_min: "2020-01-01", date_max: "2021-02-03",
    });
  });

  it("ignore les dates invalides ou placeholders et utilise les bornes par défaut", async () => {
    h.search = "date_min=date_min&date_max=pasunedate";
    const { fetchFn } = setup();
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    const args = fetchFn.mock.calls[0][0];
    expect(args.date_min).toBe("1890-01-01");
    expect(args.date_max).toBe(new Date().toISOString().split("T")[0]);
  });

  it("hasMore est vrai quand une page complète (50) est reçue, faux sinon", async () => {
    const full = setup(vi.fn().mockResolvedValue(page(50)));
    await waitFor(() => expect(full.result.current.status.loading).toBe(false));
    await waitFor(() => expect(full.result.current.items).toHaveLength(50));
    expect(full.result.current.status.hasMore).toBe(true);

    const partial = setup(vi.fn().mockResolvedValue(page(10)));
    await waitFor(() => expect(partial.result.current.items).toHaveLength(10));
    expect(partial.result.current.status.hasMore).toBe(false);
  });

  it("gère une réponse vide ou null", async () => {
    const { result } = setup(vi.fn().mockResolvedValue(null));
    await waitFor(() => expect(result.current.status.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.status.hasMore).toBe(false);
  });

  it("passe loading à true pendant le chargement", async () => {
    let resolve!: (v: unknown) => void;
    const { result } = setup(vi.fn().mockReturnValue(new Promise((r) => { resolve = r; })));
    await waitFor(() => expect(result.current.status.loading).toBe(true));
    await act(async () => { resolve(page(1)); });
    expect(result.current.status.loading).toBe(false);
  });

  it("garde les éléments existants et repasse loading à false quand le fetch échoue", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(page(50)).mockRejectedValueOnce(new Error("x"));
    const { result } = setup(fetchFn);
    await waitFor(() => expect(result.current.items).toHaveLength(50));
    await act(async () => { await result.current.fetchData(50, false); });
    expect(result.current.items).toHaveLength(50);
    expect(result.current.status.loading).toBe(false);
  });

  it("fetchData(offset, false) ajoute la page suivante et met l'offset à jour", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(page(50)).mockResolvedValueOnce(page(20, 50));
    const { result } = setup(fetchFn);
    await waitFor(() => expect(result.current.items).toHaveLength(50));
    await act(async () => { await result.current.fetchData(50, false); });
    expect(result.current.items).toHaveLength(70);
    expect(result.current.status).toMatchObject({ offset: 50, hasMore: false, loading: false });
    expect(fetchFn.mock.calls[1][0]).toMatchObject({ offset: 50, limit: 50 });
  });

  it("recharge depuis le début quand l'URL change", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(page(2)).mockResolvedValueOnce(page(1, 100));
    const { result, rerender, metadataFn } = setup(fetchFn);
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    h.search = "sort=rating";
    rerender({ f: fetchFn, m: metadataFn });
    await waitFor(() => expect(result.current.items).toEqual([{ id: 100 }]));
    expect(fetchFn.mock.calls[1][0].sort).toBe("rating");
  });

  it("ignore la réponse d'une requête périmée quand les filtres changent entre-temps", async () => {
    let resolveOld!: (v: unknown) => void;
    const fetchFn = vi
      .fn()
      .mockReturnValueOnce(new Promise((r) => { resolveOld = r; }))
      .mockResolvedValueOnce([{ id: "new" }]);
    const { result, rerender, metadataFn } = setup(fetchFn);
    h.search = "artist=x";
    rerender({ f: fetchFn, m: metadataFn });
    await waitFor(() => expect(result.current.items).toEqual([{ id: "new" }]));
    await act(async () => { resolveOld([{ id: "old" }]); });
    expect(result.current.items).toEqual([{ id: "new" }]);
  });
});

describe("useRankingLogic – métadonnées", () => {
  it("charge les métadonnées et construit filterConfig", async () => {
    const metadataFn = vi.fn().mockResolvedValue({
      max_streams: 500, max_minutes: 900, max_rating: 87, date_min: "2019-05-01", date_max: "2024-06-30",
    });
    const { result } = setup(undefined, metadataFn, "track");
    await waitFor(() => expect(result.current.metadata.max_streams).toBe(500));
    expect(result.current.filterConfig).toEqual({
      search: { track: true, artist: true, album: true },
      stats: {
        streams: { min: 0, max: 500 },
        minutes: { min: 0, max: 900 },
        engagement: { min: 0, max: 100 },
        rating: { min: 0, max: 87 },
      },
      period: { min: "2019-05-01", max: "2024-06-30" },
    });
  });

  it("filterConfig.search dépend du type (artist : pas de piste ni d'album, album : pas de piste)", () => {
    expect(setup(undefined, undefined, "artist").result.current.filterConfig.search).toEqual({
      track: false, artist: true, album: false,
    });
    expect(setup(undefined, undefined, "album").result.current.filterConfig.search).toEqual({
      track: false, artist: true, album: true,
    });
  });

  it("remplace les dates de métadonnées invalides par les bornes par défaut", async () => {
    const metadataFn = vi.fn().mockResolvedValue({ max_streams: 1, date_min: "n/a", date_max: null });
    const { result } = setup(undefined, metadataFn);
    await waitFor(() => expect(result.current.metadata.max_streams).toBe(1));
    expect(result.current.metadata.date_min).toBe("1890-01-01");
    expect(result.current.metadata.date_max).toBe(new Date().toISOString().split("T")[0]);
  });

  it("ne plante pas quand les métadonnées échouent (pas de rejet non géré)", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const metadataFn = vi.fn().mockRejectedValue(new Error("down"));
    const { result } = setup(undefined, metadataFn);
    await waitFor(() => expect(metadataFn).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(result.current.metadata.max_streams).toBe(0);
  });
});

describe("useRankingLogic – handleSort", () => {
  it("trie sur une nouvelle colonne en desc et remet l'offset à 0", async () => {
    h.search = "artist=x";
    const { result } = setup();
    await waitFor(() => expect(result.current.status.loading).toBe(false));
    act(() => result.current.handleSort("rating"));
    const [url, opts] = h.push.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/my/tracks?")).toBe(true);
    expect(Object.fromEntries(params)).toEqual({ artist: "x", sort: "rating", direction: "desc", offset: "0" });
    expect(opts).toEqual({ scroll: false });
  });

  it("inverse la direction quand on re-clique sur la colonne triée en desc", async () => {
    h.search = "sort=rating&direction=desc";
    const { result } = setup();
    await waitFor(() => expect(result.current.status.loading).toBe(false));
    act(() => result.current.handleSort("rating"));
    expect(new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]).get("direction")).toBe("asc");
  });

  it("repasse en desc quand la colonne est déjà triée en asc", async () => {
    h.search = "sort=rating&direction=asc";
    const { result } = setup();
    await waitFor(() => expect(result.current.status.loading).toBe(false));
    act(() => result.current.handleSort("rating"));
    expect(new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]).get("direction")).toBe("desc");
  });

  it("utilise le tri par défaut (play_count desc) quand l'URL n'a pas de tri", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.status.loading).toBe(false));
    act(() => result.current.handleSort("play_count"));
    expect(new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]).get("direction")).toBe("asc");
  });
});
