/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import TracksPage from "./tracks/page";
import AlbumsPage from "./albums/page";
import ArtistsPage from "./artists/page";

const h = vi.hoisted(() => ({
  api: {
    getTracks: vi.fn(), getTracksMetadata: vi.fn(),
    getAlbums: vi.fn(), getAlbumsMetadata: vi.fn(),
    getArtists: vi.fn(), getArtistsMetadata: vi.fn(),
  },
  useRankingLogic: vi.fn(),
  props: { current: null as Record<string, any> | null },
  user: { id: 1 } as { id: number } | null,
}));

vi.mock("@/app/hooks/useApiMyDatas", () => ({ useApiMyDatas: () => h.api }));
vi.mock("@/app/hooks/useRankingLogic", () => ({ useRankingLogic: (...a: unknown[]) => h.useRankingLogic(...a) }));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("@/app/components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) =>
    h.user ? <>{children}</> : <>{skeleton}</>,
}));
vi.mock("@/app/components/rankings/SkeletonRanking", () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock("@/app/components/rankings/RankingView", () => ({
  default: (props: Record<string, any>) => {
    h.props.current = props;
    return <div data-testid="ranking-view">{String(props.title)}</div>;
  },
}));

const logic = (over: Record<string, unknown> = {}) => ({
  items: [{ id: 1 }],
  status: { loading: false, hasMore: true, offset: 50 },
  currentSort: { sort: "play_count", direction: "desc" },
  filterConfig: { period: {} },
  handleSort: vi.fn(),
  fetchData: vi.fn(),
  ...over,
});

beforeEach(() => {
  h.props.current = null;
  h.user = { id: 1 };
  h.useRankingLogic.mockReset();
  h.useRankingLogic.mockReturnValue(logic());
});

describe.each([
  { name: "tracks", Page: TracksPage, type: "track", fetch: "getTracks", meta: "getTracksMetadata" },
  { name: "albums", Page: AlbumsPage, type: "album", fetch: "getAlbums", meta: "getAlbumsMetadata" },
  { name: "artists", Page: ArtistsPage, type: "artist", fetch: "getArtists", meta: "getArtistsMetadata" },
] as const)("page /my/$name", ({ Page, type, fetch, meta }) => {
  it("branche les données personnelles de l'utilisateur sur la logique de classement", () => {
    render(<Page />);
    expect(h.useRankingLogic).toHaveBeenCalledWith(h.api[fetch], h.api[meta], type);
  });

  it("affiche le classement avec le titre « mes classements » et le bon type", () => {
    render(<Page />);
    expect(screen.getByTestId("ranking-view")).toHaveTextContent(languages.fr.ranking.allmy);
    expect(h.props.current).toMatchObject({ type, title: languages.fr.ranking.allmy });
  });

  it("transmet items, tri, état de chargement et filtres à RankingView", () => {
    const l = logic({ status: { loading: true, hasMore: false, offset: 0 } });
    h.useRankingLogic.mockReturnValue(l);
    render(<Page />);
    expect(h.props.current).toMatchObject({
      items: l.items, sortConfig: l.currentSort, onSort: l.handleSort,
      loading: true, hasMore: false, filterConfig: l.filterConfig,
    });
  });

  it("loadMore charge la page suivante (offset + 50) en ajoutant aux résultats", () => {
    const l = logic();
    h.useRankingLogic.mockReturnValue(l);
    render(<Page />);
    h.props.current!.loadMore();
    expect(l.fetchData).toHaveBeenCalledWith(100, false);
  });

  it("affiche le squelette sans utilisateur connecté", () => {
    h.user = null;
    render(<Page />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("ranking-view")).toBeNull();
  });
});
