/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "@/app/constants/locales/lang";
import { ApiError } from "@/app/services/api";
import type { ItemDetail, ItemType } from "@/app/hooks/apiTypes";
import ItemDetailPage from "./ItemDetailPage";
import { makeDetail } from "./fixtures";

const fr = languages.fr;
const dict = fr.itemDetail;

const h = vi.hoisted(() => ({
  params: { id: "12" } as Record<string, string>,
  state: { data: null, loading: false, error: null, retry: vi.fn(), startDate: "", endDate: "" } as any,
  query: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => h.params, useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("next/image", () => ({
  default: ({ fill, alt, ...props }: any) => <img alt={alt} data-fill={fill ? "true" : undefined} {...props} />, // eslint-disable-line @next/next/no-img-element
}));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("./useItemDetail", () => ({ useItemDetail: (q: unknown) => { h.query(q); return h.state; } }));
vi.mock("@/app/components/dashboard/Charts", () => {
  const stub = (name: string) => {
    const Stub = (props: any) => <div data-testid={name} data-props={JSON.stringify(props)} />;
    return Stub;
  };
  return {
    WeeklyChart: stub("chart-weekly"), MonthlyChart: stub("chart-monthly"), ClockChart: stub("chart-clock"),
    CumulativeChart: stub("chart-cumulative"), AnnualChart: stub("chart-annual"),
  };
});
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
}));
vi.mock("@/app/components/Atomic/Error/Error", () => ({
  ErrorState: ({ title, message, status, onRetry }: any) => (
    <div data-testid="error-state" data-status={status}><h2>{title}</h2><p>{message}</p>{onRetry && <button onClick={onRetry}>retry-state</button>}</div>
  ),
}));

const setData = (data: ItemDetail | null, over: Record<string, unknown> = {}) => {
  h.state = { data, loading: false, error: null, retry: vi.fn(), startDate: "", endDate: "", ...over };
};

beforeEach(() => {
  h.params = { id: "12" };
  h.query.mockClear();
  setData(makeDetail());
});

const norm = (n: number) => n.toLocaleString("fr-FR").replace(/\s/g, " ");

describe.each(["track", "album", "artist"] as ItemType[])("ItemDetailPage (%s)", (type) => {
  const typeLabel = { track: dict.typeTrack, album: dict.typeAlbum, artist: dict.typeArtist }[type];
  const back = { track: ["/my/tracks", dict.backTrack], album: ["/my/albums", dict.backAlbum], artist: ["/my/artists", dict.backArtist] }[type];

  it("interroge l'API avec le type, l'id de l'adresse et la période par défaut (tout l'historique)", () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    expect(h.query).toHaveBeenCalledWith({ type, id: "12", range: "lifetime", offset: 0, customStart: "", customEnd: "" });
  });

  it("affiche l'en-tête : titre h1, type, pochette et lien de retour vers le classement", () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    expect(screen.getByRole("heading", { level: 1, name: "Nom de l'élément" })).toBeInTheDocument();
    expect(screen.getByText(typeLabel)).toBeInTheDocument();
    expect(screen.getByAltText("Nom de l'élément")).toHaveAttribute("src", "https://img/cover.jpg");
    expect(screen.getByRole("link", { name: back[1] })).toHaveAttribute("href", back[0]);
  });

  it("pochette ronde pour un artiste uniquement", () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    const wrapper = screen.getByAltText("Nom de l'élément").parentElement!;
    expect(wrapper.className.includes("rounded-full")).toBe(type === "artist");
  });

  it("affiche les cartes de stats et les rangs", () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    const stats = screen.getByRole("region", { name: dict.statsTitle });
    expect(within(stats).getByText(dict.statStreams).nextSibling).toHaveTextContent(norm(1234));
    expect(within(stats).getByText(dict.statTime).nextSibling).toHaveTextContent(`${norm(5678)} min`);
    expect(within(stats).getByText(dict.statRating).nextSibling).toHaveTextContent("1,50 ★");
    expect(within(stats).getByText(dict.statRating).nextSibling!.firstChild).toHaveClass("text2");
    expect(within(stats).getByText(dict.statFirstPlay).nextSibling).toHaveTextContent("05/03/2024");
    expect(within(stats).getByText(dict.statLastPlay).nextSibling).toHaveTextContent("20/09/2026");
    expect(within(stats).getByText(dict.statActiveDays).nextSibling).toHaveTextContent("88 j");
    expect(within(stats).getByText(dict.statAvgPerDay).nextSibling).toHaveTextContent("12,3 min");
    expect(within(stats).getByText(dict.statShare).nextSibling).toHaveTextContent("2,5%");
    const ranks = screen.getByRole("region", { name: dict.ranksTitle });
    expect(within(ranks).getByText(dict.rankStreams).nextSibling).toHaveTextContent("#3 sur 412");
    expect(within(ranks).getByText(dict.rankMinutes).nextSibling).toHaveTextContent("#5 sur 412");
    expect(within(ranks).getByText(dict.rankRating).nextSibling).toHaveTextContent(dict.noRank);
  });

  it("affiche les graphiques de la période par défaut avec la métrique minutes, puis streams au clic", async () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    for (const id of ["chart-clock", "chart-weekly", "chart-monthly", "chart-annual", "chart-cumulative"]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(JSON.parse(screen.getByTestId("chart-clock").dataset.props!).metric).toBe("minutes");
    await userEvent.click(screen.getByRole("button", { name: fr.dashboard.metricStreams }));
    expect(JSON.parse(screen.getByTestId("chart-clock").dataset.props!).metric).toBe("streams");
  });

  it("liste les dernières écoutes (date et durée)", () => {
    setData(makeDetail(type));
    render(<ItemDetailPage type={type} />);
    const recent = screen.getByRole("region", { name: dict.recentPlays });
    const items = within(recent).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("3:05");
    expect(items[1]).toHaveTextContent("1:00");
  });

  it("affiche un état vide pour les dernières écoutes", () => {
    setData(makeDetail(type, { recent_plays: [] }));
    render(<ItemDetailPage type={type} />);
    expect(screen.getByRole("status")).toHaveTextContent(dict.noRecentPlays);
  });
});

describe("ItemDetailPage – parents cliquables", () => {
  it("titre : artiste et album mènent à leur page de détail", () => {
    render(<ItemDetailPage type="track" />);
    expect(screen.getByRole("link", { name: "Artiste Parent" })).toHaveAttribute("href", "/my/artists/3");
    expect(screen.getByRole("link", { name: "Album Parent" })).toHaveAttribute("href", "/my/albums/7");
  });

  it("album : artiste seul", () => {
    setData(makeDetail("album"));
    render(<ItemDetailPage type="album" />);
    expect(screen.getByRole("link", { name: "Artiste Parent" })).toHaveAttribute("href", "/my/artists/3");
    expect(screen.queryByRole("link", { name: "Album Parent" })).toBeNull();
  });

  it("artiste : aucun parent", () => {
    setData(makeDetail("artist"));
    render(<ItemDetailPage type="artist" />);
    expect(screen.queryByRole("link", { name: "Artiste Parent" })).toBeNull();
  });

  it("sans pochette : repli accessible", () => {
    const d = makeDetail("track");
    setData({ ...d, entity: { ...d.entity, image: null } });
    render(<ItemDetailPage type="track" />);
    expect(screen.getByRole("img", { name: dict.noCover })).toBeInTheDocument();
  });
});

describe("ItemDetailPage – listes", () => {
  it("titre : aucune liste d'enfants", () => {
    render(<ItemDetailPage type="track" />);
    expect(screen.queryByText(dict.topTracks)).toBeNull();
    expect(screen.queryByText(dict.topAlbums)).toBeNull();
    expect(screen.queryByText(dict.albumTracks)).toBeNull();
  });

  it("album : titres de l'album avec liens vers leur page", () => {
    setData(makeDetail("album"));
    render(<ItemDetailPage type="album" />);
    const list = screen.getByRole("region", { name: dict.albumTracks });
    expect(within(list).getByRole("link", { name: "Enfant Titre 1" })).toHaveAttribute("href", "/my/tracks/21");
    expect(within(list).getByRole("link", { name: "Enfant Titre 2" })).toHaveAttribute("href", "/my/tracks/22");
    expect(screen.queryByText(dict.topAlbums)).toBeNull();
  });

  it("artiste : top titres et top albums avec liens", () => {
    setData(makeDetail("artist"));
    render(<ItemDetailPage type="artist" />);
    expect(within(screen.getByRole("region", { name: dict.topTracks })).getByRole("link", { name: "Enfant Titre 1" })).toHaveAttribute("href", "/my/tracks/21");
    expect(within(screen.getByRole("region", { name: dict.topAlbums })).getByRole("link", { name: "Enfant Album" })).toHaveAttribute("href", "/my/albums/31");
  });

  describe("tri des listes", () => {
    const names = (region: HTMLElement) => within(region).getAllByRole("link").map((l) => l.textContent);
    const open = () => {
      const d = makeDetail("album");
      setData({ ...d, children: { tracks: [
        { id: 21, name: "Alpha", image: null, streams: 50, minutes: 120, rating: 1.2 },
        { id: 22, name: "Bravo", image: null, streams: 10, minutes: 300, rating: null },
        { id: 23, name: "Charlie", image: null, streams: 30, minutes: 200, rating: 1.9 },
      ], albums: null } });
      render(<ItemDetailPage type="album" />);
      return screen.getByRole("region", { name: dict.albumTracks });
    };

    it("au départ : le tri de base (streams, décroissant) a sa flèche, les deux autres un tiret", () => {
      const list = open();
      const buttons = within(within(list).getByRole("group", { name: dict.sortGroup })).getAllByRole("button");
      expect(buttons.map((b) => b.textContent)).toEqual(["", "–", "–"]);
      expect(buttons[0].querySelector("svg")).not.toBeNull();
      expect(within(list).getByRole("button", { name: `${dict.sortByStreams} (${dict.sortDescending})` })).toBeInTheDocument();
      expect(names(list)).toEqual(["Alpha", "Charlie", "Bravo"]);
    });

    it("chaque bouton est calé à droite de sa colonne (affichage en flex avec justify-end), minutes comprises", () => {
      const list = open();
      for (const b of within(within(list).getByRole("group", { name: dict.sortGroup })).getAllByRole("button")) {
        expect(b.className).toContain("justify-end");
        expect(b.className).toMatch(/(^|\s)(flex|sm:flex)(\s|$)/);
        expect(b.className).not.toMatch(/\bblock\b|sm:block/);
      }
    });

    it("premier clic : du plus grand au plus petit, flèche vers le bas ; second clic : sens inverse, flèche vers le haut", async () => {
      const list = open();
      await userEvent.click(within(list).getByRole("button", { name: dict.sortByMinutes }));
      expect(names(list)).toEqual(["Bravo", "Charlie", "Alpha"]);
      const active = within(list).getByRole("button", { name: `${dict.sortByMinutes} (${dict.sortDescending})` });
      expect(active.querySelector("svg")).not.toBeNull();
      await userEvent.click(active);
      expect(names(list)).toEqual(["Alpha", "Charlie", "Bravo"]);
      expect(within(list).getByRole("button", { name: `${dict.sortByMinutes} (${dict.sortAscending})` })).toBeInTheDocument();
    });

    it("un autre tri remet le bouton précédent à un tiret", async () => {
      const list = open();
      await userEvent.click(within(list).getByRole("button", { name: dict.sortByMinutes }));
      await userEvent.click(within(list).getByRole("button", { name: dict.sortByRating }));
      expect(names(list)).toEqual(["Charlie", "Alpha", "Bravo"]);
      const buttons = within(within(list).getByRole("group", { name: dict.sortGroup })).getAllByRole("button");
      expect(buttons.map((b) => b.textContent)).toEqual(["–", "–", ""]); // seul le rating est actif (flèche)
    });

    it("cliquer sur le tri de base (streams) l'inverse puis le rétablit", async () => {
      const list = open();
      await userEvent.click(within(list).getByRole("button", { name: `${dict.sortByStreams} (${dict.sortDescending})` }));
      expect(names(list)).toEqual(["Bravo", "Charlie", "Alpha"]);
      await userEvent.click(within(list).getByRole("button", { name: `${dict.sortByStreams} (${dict.sortAscending})` }));
      expect(names(list)).toEqual(["Alpha", "Charlie", "Bravo"]);
    });

    it("tri par rating : une note absente reste en dernier", async () => {
      const list = open();
      await userEvent.click(within(list).getByRole("button", { name: dict.sortByRating }));
      expect(names(list)).toEqual(["Charlie", "Alpha", "Bravo"]);
    });

    it("chaque liste a son propre tri (artiste : titres et albums indépendants)", async () => {
      setData(makeDetail("artist"));
      render(<ItemDetailPage type="artist" />);
      const tracks = screen.getByRole("region", { name: dict.topTracks });
      const albums = screen.getByRole("region", { name: dict.topAlbums });
      await userEvent.click(within(tracks).getByRole("button", { name: dict.sortByRating }));
      expect(within(albums).queryAllByRole("button")).toHaveLength(0); // un seul album : pas de boutons de tri
      expect(within(tracks).getByRole("button", { name: `${dict.sortByRating} (${dict.sortDescending})` })).toBeInTheDocument();
    });
  });

  it("liste d'enfants vide : message d'état", () => {
    const d = makeDetail("artist");
    setData({ ...d, children: { tracks: [], albums: [] } });
    render(<ItemDetailPage type="artist" />);
    expect(screen.getAllByText(dict.emptyList)).toHaveLength(2);
  });
});

describe("ItemDetailPage – période", () => {
  it("masque cumul, semaine, mois et année pour « 24h » et réinterroge avec la période choisie", async () => {
    render(<ItemDetailPage type="track" />);
    await userEvent.click(screen.getByRole("button", { name: fr.dashboard.today }));
    expect(h.query).toHaveBeenLastCalledWith(expect.objectContaining({ range: "today", offset: 0 }));
    expect(screen.queryByTestId("chart-weekly")).toBeNull();
    expect(screen.queryByTestId("chart-cumulative")).toBeNull();
    expect(screen.getByTestId("chart-clock")).toBeInTheDocument();
  });

  it("navigation − / + entre périodes", async () => {
    render(<ItemDetailPage type="track" />);
    await userEvent.click(screen.getByRole("button", { name: fr.dashboard.month }));
    await userEvent.click(screen.getByRole("button", { name: dict.prevPeriod }));
    expect(h.query).toHaveBeenLastCalledWith(expect.objectContaining({ range: "month", offset: -1 }));
    await userEvent.click(screen.getByRole("button", { name: dict.nextPeriod }));
    expect(h.query).toHaveBeenLastCalledWith(expect.objectContaining({ range: "month", offset: 0 }));
  });

  it("période personnalisée : champs de dates", async () => {
    setData(makeDetail(), { startDate: "2026-01-01", endDate: "2026-01-31" });
    render(<ItemDetailPage type="track" />);
    await userEvent.click(screen.getByRole("button", { name: fr.dashboard.custom }));
    expect(h.query).toHaveBeenLastCalledWith(expect.objectContaining({ range: "custom", customStart: "2026-01-01", customEnd: "2026-01-31" }));
    expect(screen.getByLabelText(dict.dateStart)).toBeInTheDocument();
  });
});

describe("ItemDetailPage – états", () => {
  it("chargement initial : squelette annoncé, sans titre", () => {
    setData(null, { loading: true });
    render(<ItemDetailPage type="track" />);
    expect(screen.getByRole("status", { name: dict.loading })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("rechargement avec des données : le contenu reste affiché et la zone est occupée", () => {
    setData(makeDetail(), { loading: true });
    const { container } = render(<ItemDetailPage type="track" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.getByText(dict.loading)).toBeInTheDocument();
  });

  it("404 : état d'erreur traduit, sans bouton Réessayer", () => {
    setData(null, { error: new ApiError(404, "Not found") });
    render(<ItemDetailPage type="album" />);
    const state = screen.getByTestId("error-state");
    expect(state).toHaveAttribute("data-status", "404");
    expect(state).toHaveTextContent(dict.notFound);
    expect(state).toHaveTextContent(dict.notFoundMessage);
    expect(screen.queryByText("retry-state")).toBeNull();
  });

  it("autre erreur : message traduit selon le statut et Réessayer", async () => {
    const retry = vi.fn();
    setData(null, { error: new ApiError(500, null), retry });
    render(<ItemDetailPage type="artist" />);
    expect(screen.getByTestId("error-state")).toHaveTextContent(fr.api.errorServer);
    await userEvent.click(screen.getByText("retry-state"));
    expect(retry).toHaveBeenCalled();
  });

  it("erreur réseau : message de connexion", () => {
    setData(null, { error: new TypeError("Failed to fetch") });
    render(<ItemDetailPage type="track" />);
    expect(screen.getByTestId("error-state")).toHaveTextContent(fr.api.errorConnecting);
  });

  it("graphiques sans donnée : les composants reçoivent des tableaux vides (leur état vide s'affiche)", () => {
    const d = makeDetail();
    setData({ ...d, charts: { hourly: [], weekly: [], monthly: [], annual: [], cumulative: [] } });
    render(<ItemDetailPage type="track" />);
    expect(JSON.parse(screen.getByTestId("chart-clock").dataset.props!).data).toEqual([]);
  });
});
