import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { use } from "react";
import { languages } from "../../constants/locales/lang";
import TracksSuspense, { TracksPage } from "./page";

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  getTracks: vi.fn(),
  getTracksMetadata: vi.fn(),
  useRankingLogic: vi.fn(),
  rankingViewProps: { current: null as Record<string, unknown> | null },
  suspendOn: { current: null as Promise<void> | null },
}));

vi.mock("@/app/hooks/useApiAllDatas", () => ({
  useApiAllDatas: () => ({ getTracks: h.getTracks, getTracksMetadata: h.getTracksMetadata }),
}));
vi.mock("@/app/hooks/useRankingLogic", () => ({
  useRankingLogic: (...args: unknown[]) => {
    // Permet de simuler une suspension (chargement initial) grâce à `use`
    if (h.suspendOn.current) use(h.suspendOn.current);
    return h.useRankingLogic(...args);
  },
}));
vi.mock("../../components/rankings/RankingView", () => ({
  default: (props: Record<string, unknown>) => {
    h.rankingViewProps.current = props;
    return <div data-testid="ranking-view">{String(props.title)}</div>;
  },
}));
vi.mock("@/app/components/rankings/SkeletonRanking", () => ({
  default: () => <div data-testid="skeleton" />,
}));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

// --- Helpers ---------------------------------------------------------------

const makeLogic = (overrides: Record<string, unknown> = {}) => ({
  items: [{ id: 1, title: "Marché noir" }],
  status: { loading: false, hasMore: true, offset: 0 },
  currentSort: { sort: "play_count", direction: "desc" },
  filterConfig: { search: { track: true, artist: true, album: true } },
  handleSort: vi.fn(),
  fetchData: vi.fn(),
  ...overrides,
});

const props = () => h.rankingViewProps.current as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

beforeEach(() => {
  vi.clearAllMocks();
  h.rankingViewProps.current = null;
  h.suspendOn.current = null;
  h.useRankingLogic.mockReturnValue(makeLogic());
});

// --- Tests -----------------------------------------------------------------

describe("TracksPage – câblage des hooks", () => {
  it("utilise le hook de classement avec les routes globales « tracks » et le type 'track'", () => {
    render(<TracksPage />);
    expect(h.useRankingLogic).toHaveBeenCalledWith(h.getTracks, h.getTracksMetadata, "track");
  });

  it("n'appelle directement ni les données ni les métadonnées (c'est le rôle du hook)", () => {
    render(<TracksPage />);
    expect(h.getTracks).not.toHaveBeenCalled();
    expect(h.getTracksMetadata).not.toHaveBeenCalled();
  });
});

describe("TracksPage – rendu du classement", () => {
  it("affiche le classement avec le titre « Tous les »", () => {
    render(<TracksPage />);
    expect(screen.getByTestId("ranking-view")).toHaveTextContent(languages.fr.ranking.allthe);
  });

  it("indique le type 'track' au classement", () => {
    render(<TracksPage />);
    expect(props().type).toBe("track");
  });

  it("transmet les éléments tels quels", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    h.useRankingLogic.mockReturnValue(makeLogic({ items }));
    render(<TracksPage />);
    expect(props().items).toBe(items);
  });

  it("transmet une liste vide quand il n'y a aucun morceau", () => {
    h.useRankingLogic.mockReturnValue(makeLogic({ items: [] }));
    render(<TracksPage />);
    expect(props().items).toEqual([]);
  });

  it("transmet le tri courant, le gestionnaire de tri et la config des filtres", () => {
    const logic = makeLogic();
    h.useRankingLogic.mockReturnValue(logic);
    render(<TracksPage />);
    expect(props().sortConfig).toBe(logic.currentSort);
    expect(props().onSort).toBe(logic.handleSort);
    expect(props().filterConfig).toBe(logic.filterConfig);
  });

  it.each([true, false])("transmet l'état de chargement (%s)", (loading) => {
    h.useRankingLogic.mockReturnValue(makeLogic({ status: { loading, hasMore: true, offset: 0 } }));
    render(<TracksPage />);
    expect(props().loading).toBe(loading);
  });

  it.each([true, false])("transmet hasMore (%s)", (hasMore) => {
    h.useRankingLogic.mockReturnValue(makeLogic({ status: { loading: false, hasMore, offset: 0 } }));
    render(<TracksPage />);
    expect(props().hasMore).toBe(hasMore);
  });

  it("se met à jour quand le hook renvoie de nouvelles données", () => {
    const { rerender } = render(<TracksPage />);
    const items = [{ id: 9 }];
    h.useRankingLogic.mockReturnValue(makeLogic({ items }));
    rerender(<TracksPage />);
    expect(props().items).toBe(items);
  });
});

describe("TracksPage – pagination", () => {
  it.each([
    [0, 50],
    [50, 100],
    [150, 200],
  ])("charge la page suivante sans vider la liste (offset %i -> %i)", (offset, expected) => {
    const logic = makeLogic({ status: { loading: false, hasMore: true, offset } });
    h.useRankingLogic.mockReturnValue(logic);
    render(<TracksPage />);
    props().loadMore();
    expect(logic.fetchData).toHaveBeenCalledTimes(1);
    expect(logic.fetchData).toHaveBeenCalledWith(expected, false);
  });

  it("n'appelle pas fetchData tant que loadMore n'est pas déclenché", () => {
    const logic = makeLogic();
    h.useRankingLogic.mockReturnValue(logic);
    render(<TracksPage />);
    expect(logic.fetchData).not.toHaveBeenCalled();
  });

  it("utilise l'offset le plus récent au moment de charger la suite", () => {
    const first = makeLogic({ status: { loading: false, hasMore: true, offset: 0 } });
    h.useRankingLogic.mockReturnValue(first);
    const { rerender } = render(<TracksPage />);
    const second = makeLogic({ status: { loading: false, hasMore: true, offset: 50 } });
    h.useRankingLogic.mockReturnValue(second);
    rerender(<TracksPage />);
    props().loadMore();
    expect(second.fetchData).toHaveBeenCalledWith(100, false);
    expect(first.fetchData).not.toHaveBeenCalled();
  });
});

describe("TracksSuspense – export par défaut", () => {
  it("affiche le classement quand le contenu est prêt", () => {
    render(<TracksSuspense />);
    expect(screen.getByTestId("ranking-view")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("affiche le squelette pendant la suspension, puis le classement", async () => {
    let resolve!: () => void;
    h.suspendOn.current = new Promise<void>((r) => (resolve = r));
    // Le rendu qui suspend doit avoir lieu dans un act asynchrone
    await act(async () => { render(<TracksSuspense />); });
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("ranking-view")).not.toBeInTheDocument();

    h.suspendOn.current = null;
    await act(async () => resolve());
    expect(await screen.findByTestId("ranking-view")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("transmet les mêmes propriétés que la page nue", () => {
    const logic = makeLogic();
    h.useRankingLogic.mockReturnValue(logic);
    render(<TracksSuspense />);
    expect(props().items).toBe(logic.items);
    expect(props().type).toBe("track");
  });
});
