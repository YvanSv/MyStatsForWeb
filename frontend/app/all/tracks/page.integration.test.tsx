import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import TracksSuspense from "./page";

// Ici le vrai hook useRankingLogic est utilisé : seuls l'API, la navigation
// et l'affichage du classement sont simulés.

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  getTracks: vi.fn(),
  getTracksMetadata: vi.fn(),
  push: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  view: { current: null as Record<string, any> | null }, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

vi.mock("@/app/hooks/useApiAllDatas", () => ({
  // Références stables : le hook les utilise comme dépendances d'effets
  useApiAllDatas: () => ({ getTracks: h.getTracks, getTracksMetadata: h.getTracksMetadata }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => "/all/tracks",
  useSearchParams: () => h.searchParams.current,
}));
vi.mock("../../components/rankings/RankingView", () => ({
  default: (props: Record<string, unknown>) => {
    h.view.current = props;
    return <div data-testid="ranking-view" />;
  },
}));
vi.mock("@/app/components/rankings/SkeletonRanking", () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

// --- Helpers ---------------------------------------------------------------

const view = () => h.view.current!;
const tracks = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: from + i + 1, title: `Titre ${from + i + 1}` }));
const lastCall = () => h.getTracks.mock.calls.at(-1)![0];

const setUrl = (query = "") => { h.searchParams.current = new URLSearchParams(query); };

/** Rend la page et attend la fin du premier chargement. */
const renderLoaded = async () => {
  const utils = render(<TracksSuspense />);
  await waitFor(() => expect(view().loading).toBe(false));
  return utils;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.view.current = null;
  setUrl("");
  h.getTracks.mockReset().mockResolvedValue([]);
  h.getTracksMetadata.mockReset().mockResolvedValue(null);
});

// --- Tests -----------------------------------------------------------------

describe("TracksPage + useRankingLogic – premier chargement", () => {
  it("demande la première page (offset 0, 50 éléments) avec le tri par défaut", async () => {
    await renderLoaded();
    expect(h.getTracks).toHaveBeenCalledTimes(1);
    expect(lastCall()).toMatchObject({ sort: "play_count", direction: "desc", offset: 0, limit: 50 });
  });

  it("envoie les minimums à 0 et aucun maximum tant que l'utilisateur n'a rien filtré", async () => {
    await renderLoaded();
    expect(lastCall()).toMatchObject({ streams_min: "0", minutes_min: "0", engagement_min: "0", rating_min: "0" });
    for (const key of ["streams_max", "minutes_max", "engagement_max", "rating_max"]) {
      expect(lastCall()[key]).toBeUndefined();
    }
  });

  it("envoie des recherches vides par défaut", async () => {
    await renderLoaded();
    expect(lastCall()).toMatchObject({ track: "", artist: "", album: "" });
  });

  it("demande aussi les métadonnées une seule fois", async () => {
    await renderLoaded();
    await waitFor(() => expect(h.getTracksMetadata).toHaveBeenCalledTimes(1));
  });

  it("indique le chargement pendant la requête", async () => {
    let resolve!: (v: unknown[]) => void;
    h.getTracks.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<TracksSuspense />);
    await waitFor(() => expect(view().loading).toBe(true));
    await act(async () => resolve(tracks(3)));
    await waitFor(() => expect(view().loading).toBe(false));
  });

  it("transmet les morceaux reçus au classement", async () => {
    h.getTracks.mockResolvedValue(tracks(3));
    await renderLoaded();
    expect(view().items).toEqual(tracks(3));
  });

  it("transmet le type 'track' au classement", async () => {
    await renderLoaded();
    expect(view().type).toBe("track");
  });
});

describe("TracksPage + useRankingLogic – pagination", () => {
  it("annonce qu'il reste des morceaux quand la page est pleine (50)", async () => {
    h.getTracks.mockResolvedValue(tracks(50));
    await renderLoaded();
    expect(view().hasMore).toBe(true);
  });

  it.each([0, 1, 49])("annonce qu'il n'y a plus de morceaux quand la page en contient %i", async (n) => {
    h.getTracks.mockResolvedValue(tracks(n));
    await renderLoaded();
    expect(view().hasMore).toBe(false);
  });

  it("charge la page suivante (offset 50) et l'ajoute à la suite", async () => {
    h.getTracks.mockResolvedValueOnce(tracks(50)).mockResolvedValueOnce(tracks(10, 50));
    await renderLoaded();

    await act(async () => view().loadMore());
    await waitFor(() => expect(view().items).toHaveLength(60));

    expect(lastCall()).toMatchObject({ offset: 50, limit: 50 });
    expect(view().items.map((t: { id: number }) => t.id)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(view().hasMore).toBe(false);
  });

  it("enchaîne les pages : 50 puis 100", async () => {
    h.getTracks
      .mockResolvedValueOnce(tracks(50))
      .mockResolvedValueOnce(tracks(50, 50))
      .mockResolvedValueOnce(tracks(5, 100));
    await renderLoaded();

    await act(async () => view().loadMore());
    await waitFor(() => expect(view().items).toHaveLength(100));
    await act(async () => view().loadMore());
    await waitFor(() => expect(view().items).toHaveLength(105));

    expect(h.getTracks.mock.calls.map(([arg]) => arg.offset)).toEqual([0, 50, 100]);
  });

  it("garde les morceaux déjà chargés quand la page suivante échoue", async () => {
    h.getTracks.mockResolvedValueOnce(tracks(50)).mockRejectedValueOnce(new Error("réseau"));
    await renderLoaded();

    await act(async () => view().loadMore());
    await waitFor(() => expect(view().loading).toBe(false));
    expect(view().items).toHaveLength(50);
  });
});

describe("TracksPage + useRankingLogic – erreurs et cas limites", () => {
  it("affiche une liste vide quand la requête échoue", async () => {
    h.getTracks.mockRejectedValue(new Error("réseau"));
    await renderLoaded();
    expect(view().items).toEqual([]);
  });

  it("arrête le chargement quand la requête échoue", async () => {
    h.getTracks.mockRejectedValue(new Error("réseau"));
    await renderLoaded();
    expect(view().loading).toBe(false);
  });

  it("traite une réponse nulle comme une liste vide", async () => {
    h.getTracks.mockResolvedValue(null);
    await renderLoaded();
    expect(view().items).toEqual([]);
    expect(view().hasMore).toBe(false);
  });
});

describe("TracksPage + useRankingLogic – filtres lus dans l'URL", () => {
  it("reprend le tri et la direction de l'URL", async () => {
    setUrl("sort=rating&direction=asc");
    await renderLoaded();
    expect(lastCall()).toMatchObject({ sort: "rating", direction: "asc" });
    expect(view().sortConfig).toMatchObject({ sort: "rating", direction: "asc" });
  });

  it("reprend les recherches texte de l'URL", async () => {
    setUrl("track=noir&artist=SCH&album=Marché");
    await renderLoaded();
    expect(lastCall()).toMatchObject({ track: "noir", artist: "SCH", album: "Marché" });
  });

  it("envoie les minimums et maximums choisis par l'utilisateur", async () => {
    setUrl("streams_min=10&streams_max=200&minutes_min=5&minutes_max=900&engagement_min=40&engagement_max=90&rating_min=1&rating_max=3");
    await renderLoaded();
    expect(lastCall()).toMatchObject({
      streams_min: "10", streams_max: "200",
      minutes_min: "5", minutes_max: "900",
      engagement_min: "40", engagement_max: "90",
      rating_min: "1", rating_max: "3",
    });
  });

  it("utilise les dates de l'URL quand elles sont valides", async () => {
    setUrl("date_min=2024-01-01&date_max=2024-12-31");
    await renderLoaded();
    expect(lastCall()).toMatchObject({ date_min: "2024-01-01", date_max: "2024-12-31" });
  });

  it.each(["not-a-date", "date_min", "2024-1-1", "01/01/2024"])("ignore la date invalide « %s »", async (bad) => {
    setUrl(`date_min=${encodeURIComponent(bad)}`);
    await renderLoaded();
    // Retombe sur la date minimale par défaut
    expect(lastCall().date_min).toBe("1890-01-01");
  });

  it("recharge depuis le début et remplace la liste quand l'URL change", async () => {
    h.getTracks.mockResolvedValueOnce(tracks(3)).mockResolvedValueOnce(tracks(2, 100));
    const { rerender } = await renderLoaded();
    expect(view().items).toHaveLength(3);

    setUrl("sort=total_minutes");
    rerender(<TracksSuspense />);
    await waitFor(() => expect(view().items).toEqual(tracks(2, 100)));
    expect(lastCall()).toMatchObject({ sort: "total_minutes", offset: 0 });
  });

  it("ne recharge pas quand l'URL est identique", async () => {
    setUrl("sort=rating");
    const { rerender } = await renderLoaded();
    setUrl("sort=rating");
    rerender(<TracksSuspense />);
    expect(h.getTracks).toHaveBeenCalledTimes(1);
  });
});

describe("TracksPage + useRankingLogic – tri", () => {
  it("inverse la direction quand on retrie sur la colonne courante", async () => {
    await renderLoaded();
    view().onSort("play_count");
    expect(h.push).toHaveBeenCalledTimes(1);
    const [url, options] = h.push.mock.calls[0];
    expect(url).toContain("/all/tracks?");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("sort")).toBe("play_count");
    expect(params.get("direction")).toBe("asc");
    expect(params.get("offset")).toBe("0");
    expect(options).toEqual({ scroll: false });
  });

  it("trie en décroissant quand on change de colonne", async () => {
    await renderLoaded();
    view().onSort("rating");
    const params = new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]);
    expect(params.get("sort")).toBe("rating");
    expect(params.get("direction")).toBe("desc");
  });

  it("repasse en décroissant quand la colonne courante était déjà en croissant", async () => {
    setUrl("sort=rating&direction=asc");
    await renderLoaded();
    view().onSort("rating");
    const params = new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]);
    expect(params.get("direction")).toBe("desc");
  });

  it("conserve les autres filtres de l'URL en changeant le tri", async () => {
    setUrl("artist=SCH&streams_min=10");
    await renderLoaded();
    view().onSort("engagement");
    const params = new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]);
    expect(params.get("artist")).toBe("SCH");
    expect(params.get("streams_min")).toBe("10");
    expect(params.get("sort")).toBe("engagement");
  });
});

describe("TracksPage + useRankingLogic – configuration des filtres", () => {
  it("propose les filtres de recherche titre, artiste et album pour les morceaux", async () => {
    await renderLoaded();
    expect(view().filterConfig.search).toEqual({ track: true, artist: true, album: true });
  });

  it("utilise des bornes à 0 tant que les métadonnées ne sont pas chargées", async () => {
    await renderLoaded();
    expect(view().filterConfig.stats).toMatchObject({
      streams: { min: 0, max: 0 },
      minutes: { min: 0, max: 0 },
      rating: { min: 0, max: 0 },
      engagement: { min: 0, max: 100 },
    });
  });

  it("calibre les filtres avec les métadonnées reçues", async () => {
    h.getTracksMetadata.mockResolvedValue({
      max_streams: 210, max_minutes: 819, max_rating: 1.65,
      date_min: "2020-12-22", date_max: "2026-09-30",
    });
    await renderLoaded();
    await waitFor(() => expect(view().filterConfig.stats.streams.max).toBe(210));
    expect(view().filterConfig.stats).toMatchObject({
      streams: { min: 0, max: 210 },
      minutes: { min: 0, max: 819 },
      rating: { min: 0, max: 1.65 },
      engagement: { min: 0, max: 100 },
    });
    expect(view().filterConfig.period).toEqual({ min: "2020-12-22", max: "2026-09-30" });
  });

  it("utilise les dates des métadonnées comme bornes par défaut de la requête", async () => {
    h.getTracksMetadata.mockResolvedValue({ max_streams: 1, max_minutes: 1, max_rating: 1, date_min: "2021-05-01", date_max: "2025-05-01" });
    await renderLoaded();
    await waitFor(() => expect(view().sortConfig.date_min).toBe("2021-05-01"));
    expect(view().sortConfig.date_max).toBe("2025-05-01");
  });

  it("remplace une date invalide des métadonnées par la valeur par défaut", async () => {
    h.getTracksMetadata.mockResolvedValue({ max_streams: 5, max_minutes: 1, max_rating: 1, date_min: "n'importe quoi", date_max: null });
    await renderLoaded();
    await waitFor(() => expect(view().filterConfig.stats.streams.max).toBe(5));
    expect(view().filterConfig.period.min).toBe("1890-01-01");
    expect(view().filterConfig.period.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
