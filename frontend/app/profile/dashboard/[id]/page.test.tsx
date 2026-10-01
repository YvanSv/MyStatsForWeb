/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "@/app/constants/locales/lang";
import DashboardPage from "./page";
import { INITIAL_STATS } from "./utils";

const dict = languages.fr.dashboard;

const h = vi.hoisted(() => ({
  params: {} as Record<string, any>,
  getDashboard: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => h.params }));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("@/app/hooks/useProfile", () => ({
  useProfile: () => ({ getDashboard: h.getDashboard, getProfile: h.getProfile }),
}));
vi.mock("@/app/components/dashboard/Charts", () => {
  const stub = (name: string) => {
    const Comp = (props: any) => <div data-testid={name} data-props={JSON.stringify(props)} />;
    return Comp;
  };
  return {
    WeeklyChart: stub("chart-weekly"),
    MonthlyChart: stub("chart-monthly"),
    ClockChart: stub("chart-clock"),
    CumulativeChart: stub("chart-cumulative"),
    EvolutionChart: stub("chart-evolution"),
    AnnualChart: stub("chart-annual"),
    EvolutionStreamsChart: stub("chart-streams"),
  };
});
vi.mock("@/app/components/small_elements/CustomSpinner", () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}));
vi.mock("@/app/components/Atomic/Error/Error", () => ({
  ErrorState: ({ title, status }: { title?: string; status?: number }) => (
    <div data-testid="error-state" data-status={status}>{title}</div>
  ),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
}));

// --- Helpers ---------------------------------------------------------------

const local = (y: number, m: number, d: number, h2 = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h2, mi, s, ms);
const startOf = (y: number, m: number, d: number) => local(y, m, d).toISOString();
const endOf = (y: number, m: number, d: number) => local(y, m, d, 23, 59, 59, 999).toISOString();
// Testing Library normalise les espaces (dont l'espace insécable fine) du DOM : on fait de même
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n).replace(/\s/g, " ");

const hours = (overrides: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, value: overrides[i] ?? 0, streams: 1 }));

const media = (prefix: string) => [
  { name: `${prefix} minutes`, artist: `Artiste ${prefix} M`, album: `Album ${prefix} M`, image: `/${prefix}-m.png` },
  { name: `${prefix} streams`, artist: `Artiste ${prefix} S`, album: `Album ${prefix} S`, image: `/${prefix}-s.png` },
];

const makeStats = (overrides: Record<string, any> = {}) => ({
  ...INITIAL_STATS,
  totalTime: 1234,
  totalStreams: 5678,
  ratio: "42%",
  uniqueTracks: 111,
  uniqueAlbums: 22,
  uniqueArtists: 3,
  peakHour: ["18h", "20h"],
  peakDay: ["Lundi", "Samedi"],
  peakMonth: ["Mai", "Juillet"],
  topTrack: media("Track"),
  topAlbum: media("Album"),
  topArtist: media("Artist"),
  clockData: hours(),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const chartProps = (testId: string) => JSON.parse(screen.getByTestId(testId).getAttribute("data-props")!);

const renderLoaded = async () => {
  const utils = render(<DashboardPage />);
  await screen.findByText(`${fmt(1234)} ${dict.unitMin}`);
  return utils;
};

const clickInterval = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(screen.getByRole("button", { name: label }));
};

const minusButtons = () => screen.getAllByRole("button", { name: "−" });
const plusButtons = () => screen.getAllByRole("button", { name: "+" });
const switchButtons = (icon: "play" | "clock") =>
  screen.getAllByRole("button", { hidden: true }).filter((b) => b.tagName === "BUTTON" && b.querySelector(`svg.lucide-${icon}`));
const sectionOf = (title: string) =>
  screen.getByRole("heading", { level: 2, name: title, hidden: true }).closest('[class*="overflow-hidden"][class*="relative"]') as HTMLElement;

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div data-testid="crashed" /> : this.props.children; }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(local(2026, 10, 1, 12));
  h.params = { id: "yvan" };
  h.getDashboard.mockReset();
  h.getProfile.mockReset();
  h.getDashboard.mockResolvedValue(makeStats());
  h.getProfile.mockResolvedValue({ avatar: "/avatar.png", display_name: "Yvan" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// --- Tests -----------------------------------------------------------------

describe("DashboardPage [id] : rendu initial", () => {
  it("affiche le titre, le sous-titre et les trois sections", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 1, name: dict.title })).toBeInTheDocument();
    expect(screen.getByText(dict.subtitle)).toBeInTheDocument();
    for (const t of [dict.tabActivity, dict.tabLibrary, dict.tabHabits]) {
      expect(screen.getByRole("heading", { level: 2, name: t, hidden: true })).toBeInTheDocument();
    }
  });

  it("charge le profil et les stats de l'identifiant de l'URL (lifetime sans bornes)", async () => {
    await renderLoaded();
    expect(h.getProfile).toHaveBeenCalledWith("yvan");
    expect(h.getDashboard).toHaveBeenCalledWith("yvan", null, null);
  });

  it("affiche l'avatar du profil chargé", async () => {
    await renderLoaded();
    await waitFor(() => expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "/avatar.png"));
  });

  it("n'a pas de src d'avatar quand le profil est null", async () => {
    h.getProfile.mockResolvedValue(null);
    await renderLoaded();
    expect(screen.getByAltText("Avatar")).not.toHaveAttribute("src");
  });

  it("l'avatar d'un profil marqué spécial par le serveur reçoit le dégradé", async () => {
    h.getProfile.mockResolvedValue({ avatar: "/a.png", display_name: "Yvan", is_special: true });
    const { container } = await renderLoaded();
    await waitFor(() => expect(container.querySelector(".bg-gradient-to-tr")).not.toBeNull());
  });

  it("un simple pseudo « Yvantmtc » ne reçoit pas le dégradé (le style ne dépend pas du nom)", async () => {
    h.getProfile.mockResolvedValue({ avatar: "/a.png", display_name: "Yvantmtc" });
    const { container } = await renderLoaded();
    await waitFor(() => expect(screen.getByAltText("Avatar")).toBeInTheDocument());
    expect(container.querySelector(".bg-gradient-to-tr")).toBeNull();
  });

  it("n'injecte pas les classes parasites 'false' ou 'undefined' dans le DOM", async () => {
    const { container } = await renderLoaded();
    const bad = Array.from(container.querySelectorAll("[class]")).filter((el) =>
      el.getAttribute("class")!.split(/\s+/).some((c) => c === "false" || c === "undefined"));
    expect(bad).toHaveLength(0);
  });

  it("ne charge rien quand l'identifiant est absent", () => {
    h.params = {};
    render(<DashboardPage />);
    expect(h.getDashboard).not.toHaveBeenCalled();
    expect(h.getProfile).not.toHaveBeenCalled();
  });

  it("recharge profil et stats quand l'identifiant change", async () => {
    const { rerender } = await renderLoaded();
    h.params = { id: "autre" };
    rerender(<DashboardPage />);
    await waitFor(() => expect(h.getProfile).toHaveBeenCalledWith("autre"));
    expect(h.getDashboard).toHaveBeenCalledWith("autre", null, null);
  });
});

describe("DashboardPage [id] : chargement et valeurs", () => {
  it("affiche '...' pendant le chargement puis les valeurs formatées", async () => {
    render(<DashboardPage />);
    expect(screen.getAllByText("...").length).toBeGreaterThan(0);
    expect(await screen.findByText(`${fmt(1234)} ${dict.unitMin}`)).toBeInTheDocument();
    expect(screen.queryAllByText("...")).toHaveLength(0);
    expect(screen.getByText(fmt(5678))).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("111")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("affiche les libellés de toutes les cartes de stats", async () => {
    await renderLoaded();
    for (const l of [dict.statTime, dict.statStreams, dict.statEngagement, dict.statTracks, dict.statAlbums,
      dict.statArtists, dict.statPeakHour, dict.statPeakDay, dict.statPeakMonth]) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
  });

  it("le chargement dure tant que les stats ne sont pas arrivées, même si le profil est déjà là", async () => {
    const stats = deferred<any>();
    h.getDashboard.mockReturnValue(stats.promise);
    render(<DashboardPage />);
    await waitFor(() => expect(h.getProfile).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(screen.getAllByText("...").length).toBeGreaterThan(0);
    await act(async () => { stats.resolve(makeStats()); });
  });

  it("formate les grands nombres avec la locale française", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ totalTime: 1234567, totalStreams: 9876543 }));
    render(<DashboardPage />);
    expect(await screen.findByText(`${fmt(1234567)} ${dict.unitMin}`)).toBeInTheDocument();
    expect(screen.getByText(fmt(9876543))).toBeInTheDocument();
  });

  it("arrondit les décimales (aucune décimale affichée)", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ totalTime: 12.6, totalStreams: 4.4, uniqueArtists: 9 }));
    render(<DashboardPage />);
    expect(await screen.findByText(`13 ${dict.unitMin}`)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("affiche des zéros pour des stats vides", async () => {
    h.getDashboard.mockResolvedValue({ ...INITIAL_STATS });
    render(<DashboardPage />);
    expect(await screen.findByText(`0 ${dict.unitMin}`)).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("affiche les valeurs de pointe selon la métrique minutes par défaut", async () => {
    await renderLoaded();
    expect(screen.getByText("18h")).toBeInTheDocument();
    expect(screen.getByText("Lundi")).toBeInTheDocument();
    expect(screen.getByText("Mai")).toBeInTheDocument();
  });

  it("des pointes vides n'empêchent pas le rendu", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ peakHour: [], peakDay: [], peakMonth: [] }));
    await renderLoaded();
    expect(screen.getByText(dict.statPeakHour)).toBeInTheDocument();
  });
});

describe("DashboardPage [id] : erreurs", () => {
  it("affiche l'état introuvable quand le profil renvoie 404", async () => {
    h.getProfile.mockRejectedValue({ status: 404 });
    h.getDashboard.mockRejectedValue({ status: 404 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Boundary : un crash de rendu (hooks après un return anticipé) échoue proprement au lieu d'une exception globale
    render(<Boundary><DashboardPage /></Boundary>);
    const err = await screen.findByTestId("error-state");
    expect(err).toHaveTextContent(dict.notFound);
    expect(err).toHaveAttribute("data-status", "404");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("n'affiche pas l'état introuvable pour une erreur non 404", async () => {
    h.getProfile.mockRejectedValue({ status: 500 });
    h.getDashboard.mockRejectedValue({ status: 500 });
    render(<DashboardPage />);
    await waitFor(() => expect(h.getDashboard).toHaveBeenCalled());
    await screen.findByText(`0 ${dict.unitMin}`);
    expect(screen.queryByTestId("error-state")).toBeNull();
  });

  it("garde la page quand seules les stats renvoient 404 mais que le profil existe", async () => {
    h.getDashboard.mockRejectedValue({ status: 404 });
    render(<DashboardPage />);
    await screen.findByText(`0 ${dict.unitMin}`);
    await waitFor(() => expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "/avatar.png"));
    expect(screen.queryByTestId("error-state")).toBeNull();
  });

  it("réinitialise les stats quand le chargement échoue après un succès", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    h.getDashboard.mockRejectedValue({ status: 500 });
    await clickInterval(user, dict.year);
    await screen.findByText(`0 ${dict.unitMin}`);
    expect(screen.queryByText(`${fmt(1234)} ${dict.unitMin}`)).toBeNull();
  });

  it("ne produit pas de rejet non géré quand le profil échoue", async () => {
    h.getProfile.mockRejectedValue(new Error("boom"));
    render(<DashboardPage />);
    await screen.findByText(`${fmt(1234)} ${dict.unitMin}`);
  });
});

describe("DashboardPage [id] : sélection de l'intervalle", () => {
  it("lifetime est l'intervalle par défaut : libellé de tout l'historique, − désactivé", async () => {
    await renderLoaded();
    expect(screen.getAllByText("Tout l'historique")).toHaveLength(2);
    for (const b of minusButtons()) expect(b).toBeDisabled();
    for (const b of plusButtons()) expect(b).toBeDisabled();
  });

  it("choisir Mois affiche le mois courant et relance les stats avec les bornes ISO", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.month);
    expect(screen.getAllByText("Octobre 2026")).toHaveLength(2);
    await waitFor(() => expect(h.getDashboard).toHaveBeenLastCalledWith("yvan", startOf(2026, 10, 1), endOf(2026, 10, 31)));
  });

  it("« − » recule d'un mois et « + » est alors activé", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.month);
    expect(plusButtons()[0]).toBeDisabled();
    await user.click(minusButtons()[0]);
    expect(screen.getAllByText("Septembre 2026")).toHaveLength(2);
    expect(plusButtons()[0]).toBeEnabled();
    await waitFor(() => expect(h.getDashboard).toHaveBeenLastCalledWith("yvan", startOf(2026, 9, 1), endOf(2026, 9, 30)));
  });

  it("« + » revient au mois suivant", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.month);
    await user.click(minusButtons()[1]);
    await user.click(plusButtons()[1]);
    expect(screen.getAllByText("Octobre 2026")).toHaveLength(2);
    expect(plusButtons()[0]).toBeDisabled();
  });

  it("changer d'intervalle remet le décalage à zéro", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.month);
    await user.click(minusButtons()[0]);
    await user.click(minusButtons()[0]);
    expect(screen.getAllByText("Août 2026")).toHaveLength(2);
    await clickInterval(user, dict.year);
    expect(screen.getAllByText("2026")).toHaveLength(2);
  });

  it("le libellé d'une saison et d'une année s'affichent", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.season);
    expect(screen.getAllByText("Automne 2026")).toHaveLength(2);
    await user.click(minusButtons()[0]);
    expect(screen.getAllByText("Été 2026")).toHaveLength(2);
  });

  it("revenir à lifetime redemande tout l'historique", async () => {
    const user = userEvent.setup();
    const { container } = await renderLoaded();
    await clickInterval(user, dict.year);
    await user.click(container.querySelector("svg.lucide-infinity")!.closest("button")!);
    await waitFor(() => expect(h.getDashboard).toHaveBeenLastCalledWith("yvan", null, null));
  });

  it("pour la semaine, affiche deux champs date remplis avec les bornes", async () => {
    vi.setSystemTime(local(2026, 10, 14, 12));
    const user = userEvent.setup();
    const { container } = await renderLoaded();
    await clickInterval(user, dict.week);
    await waitFor(() => {
      const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="date"]'));
      expect(inputs).toHaveLength(4);
      expect(inputs[0].value).toBe("2026-10-11");
      expect(inputs[1].value).toBe("2026-10-17");
    });
  });

  it("modifier la date de début applique la période personnalisée choisie", async () => {
    vi.setSystemTime(local(2026, 10, 14, 12));
    const user = userEvent.setup();
    const { container } = await renderLoaded();
    await clickInterval(user, dict.week);
    const input = container.querySelectorAll<HTMLInputElement>('input[type="date"]')[0];
    fireEvent.change(input, { target: { value: "2026-05-01" } });
    await waitFor(() => expect(h.getDashboard.mock.calls.at(-1)![1]).toBe(startOf(2026, 5, 1)));
  });
});

describe("DashboardPage [id] : onglets", () => {
  it("l'onglet Activité est ouvert par défaut", async () => {
    await renderLoaded();
    expect(sectionOf(dict.tabActivity).className).toContain("flex-[20]");
    expect(sectionOf(dict.tabLibrary).className).toContain("flex-[1]");
    expect(sectionOf(dict.tabHabits).className).toContain("flex-[1]");
  });

  it("un clic sur Bibliothèque l'ouvre et ferme les autres", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole("heading", { level: 2, name: dict.tabLibrary, hidden: true }));
    expect(sectionOf(dict.tabLibrary).className).toContain("flex-[20]");
    expect(sectionOf(dict.tabActivity).className).toContain("flex-[1]");
  });

  it("un clic sur Habitudes l'ouvre", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole("heading", { level: 2, name: dict.tabHabits, hidden: true }));
    expect(sectionOf(dict.tabHabits).className).toContain("flex-[20]");
  });

  it("le clic sur le commutateur de métrique ouvre aussi la section", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(within(sectionOf(dict.tabLibrary)).getAllByRole("button", { hidden: true })[1]);
    expect(sectionOf(dict.tabLibrary).className).toContain("flex-[20]");
  });
});

describe("DashboardPage [id] : métrique", () => {
  it("affiche les tops par minutes par défaut", async () => {
    await renderLoaded();
    expect(screen.getByText("Track minutes")).toBeInTheDocument();
    expect(screen.getByText("Album minutes")).toBeInTheDocument();
    expect(screen.getByText("Artist minutes")).toBeInTheDocument();
    expect(screen.getByText(dict.topTrack)).toBeInTheDocument();
  });

  it("basculer sur streams change les tops et les valeurs de pointe", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(switchButtons("play")[0]);
    expect(screen.getByText("Track streams")).toBeInTheDocument();
    expect(screen.getByText("Album streams")).toBeInTheDocument();
    expect(screen.getByText("Artist streams")).toBeInTheDocument();
    expect(screen.getByText("20h")).toBeInTheDocument();
    expect(screen.getByText("Samedi")).toBeInTheDocument();
    expect(screen.getByText("Juillet")).toBeInTheDocument();
    expect(screen.queryByText("Track minutes")).toBeNull();
  });

  it("les deux commutateurs sont synchronisés et transmettent la métrique aux graphiques", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(switchButtons("play")).toHaveLength(2);
    await user.click(switchButtons("play")[1]);
    expect(chartProps("chart-clock").metric).toBe("streams");
    expect(chartProps("chart-weekly").metric).toBe("streams");
    expect(switchButtons("play")[0].className).toContain("bg-vert");
    await user.click(switchButtons("clock")[0]);
    expect(chartProps("chart-clock").metric).toBe("minutes");
  });

  it("des tops absents (null) affichent 'Aucun' en métrique minutes", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ topTrack: null, topAlbum: null, topArtist: null }));
    await renderLoaded();
    expect(screen.getAllByText(dict.none)).toHaveLength(3);
  });

  it("des tops absents (null) ne plantent pas en métrique streams", async () => {
    const user = userEvent.setup();
    h.getDashboard.mockResolvedValue(makeStats({ topTrack: null, topAlbum: null, topArtist: null }));
    render(<Boundary><DashboardPage /></Boundary>);
    await screen.findByText(`${fmt(1234)} ${dict.unitMin}`);
    await user.click(switchButtons("play")[0]);
    expect(screen.queryByTestId("crashed")).toBeNull();
    expect(screen.getAllByText(dict.none)).toHaveLength(3);
  });
});

describe("DashboardPage [id] : graphiques selon l'intervalle", () => {
  it("lifetime : tous les graphiques sont présents", async () => {
    await renderLoaded();
    for (const id of ["chart-cumulative", "chart-streams", "chart-evolution", "chart-clock", "chart-weekly", "chart-monthly", "chart-annual"]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(screen.getByText(dict.statPeakDay)).toBeInTheDocument();
    expect(screen.getByText(dict.statPeakMonth)).toBeInTheDocument();
  });

  it("today : ni cumul, ni évolution, ni hebdo, ni mensuel, ni jour favori", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.today);
    for (const id of ["chart-cumulative", "chart-streams", "chart-evolution", "chart-weekly", "chart-monthly", "chart-annual"]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.queryByText(dict.statPeakDay)).toBeNull();
    expect(screen.queryByText(dict.statPeakMonth)).toBeNull();
    expect(screen.getByTestId("chart-clock")).toBeInTheDocument();
    expect(chartProps("chart-clock").daysCount).toBe(1);
  });

  it("month : hebdo et évolution, mais ni mensuel ni annuel ni mois musical", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.month);
    expect(screen.getByTestId("chart-weekly")).toBeInTheDocument();
    expect(screen.getByTestId("chart-cumulative")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-monthly")).toBeNull();
    expect(screen.queryByTestId("chart-annual")).toBeNull();
    expect(screen.queryByText(dict.statPeakMonth)).toBeNull();
    expect(screen.getByText(dict.statPeakDay)).toBeInTheDocument();
    expect(chartProps("chart-clock").daysCount).toBe(0);
  });

  it.each([dict.week, dict.season, dict.lastMonth])("%s : pas de graphique mensuel ni annuel", async (label) => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, label);
    expect(screen.queryByTestId("chart-monthly")).toBeNull();
    expect(screen.queryByTestId("chart-annual")).toBeNull();
  });

  it.each([dict.sixMonths, dict.year])("%s : graphique mensuel et mois musical, sans annuel", async (label) => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, label);
    expect(screen.getByTestId("chart-monthly")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-annual")).toBeNull();
    expect(screen.getByText(dict.statPeakMonth)).toBeInTheDocument();
  });

  it("transmet les données brutes aux graphiques hebdo, mensuel, annuel et évolution", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      weeklyData: [{ d: "lun" }], monthlyData: [{ m: "jan" }], annualData: [{ a: 2025 }], entityEvolution: [{ e: 1 }],
    }));
    await renderLoaded();
    expect(chartProps("chart-weekly").data).toEqual([{ d: "lun" }]);
    expect(chartProps("chart-monthly").data).toEqual([{ m: "jan" }]);
    expect(chartProps("chart-annual").data).toEqual([{ a: 2025 }]);
    expect(chartProps("chart-evolution").data).toEqual([{ e: 1 }]);
  });

  it("applique une grille à une colonne pour today et trois colonnes pour lifetime (stats d'habitudes)", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const grid = () => screen.getByText(dict.statPeakHour).closest('[class*="grid-cols"]') as HTMLElement;
    expect(grid().className).toContain("grid-cols-3");
    await clickInterval(user, dict.today);
    expect(grid().className).toContain("grid-cols-1");
    await clickInterval(user, dict.month);
    expect(grid().className).toContain("grid-cols-2");
  });
});

describe("DashboardPage [id] : lissage horaire (24h)", () => {
  const clockAfterToday = async (clockData: any[]) => {
    const user = userEvent.setup();
    h.getDashboard.mockResolvedValue(makeStats({ clockData }));
    await renderLoaded();
    await clickInterval(user, dict.today);
    await waitFor(() => expect(h.getDashboard).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryAllByText("...")).toHaveLength(0));
    return chartProps("chart-clock").data as { hour: string; value: number }[];
  };

  it("en lifetime, les données horaires ne sont pas lissées", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ clockData: hours({ 3: 100 }) }));
    await renderLoaded();
    expect(chartProps("chart-clock").data[3].value).toBe(100);
  });

  it("plafonne une heure à 60 et reporte le surplus sur l'heure suivante", async () => {
    const data = await clockAfterToday(hours({ 10: 75 }));
    expect(data[10].value).toBe(60);
    expect(data[11].value).toBe(15);
  });

  it("ne modifie pas les valeurs inférieures ou égales à 60 (limite 60 incluse)", async () => {
    const data = await clockAfterToday(hours({ 5: 60, 6: 59, 7: 0 }));
    expect(data.slice(5, 8).map((d) => d.value)).toEqual([60, 59, 0]);
  });

  it("propage le surplus en cascade sur plusieurs heures", async () => {
    const data = await clockAfterToday(hours({ 8: 150 }));
    expect(data[8].value).toBe(60);
    expect(data[9].value).toBe(60);
    expect(data[10].value).toBe(30);
  });

  it("23h déborde sur 0h (cycle du cadran)", async () => {
    const data = await clockAfterToday(hours({ 23: 100 }));
    expect(data[23].value).toBe(60);
    expect(data[0].value).toBe(40);
  });

  it("le surplus d'une cascade passant par minuit est conservé", async () => {
    const data = await clockAfterToday(hours({ 22: 200, 23: 50, 0: 50 }));
    const total = data.reduce((s, d) => s + d.value, 0);
    expect(total).toBe(300);
    for (const d of data) expect(d.value).toBeLessThanOrEqual(60);
  });

  it("la somme des valeurs est conservée quand tout tient dans la journée", async () => {
    const raw = hours({ 2: 90, 9: 130, 20: 61 });
    const data = await clockAfterToday(raw);
    expect(data.reduce((s, d) => s + d.value, 0)).toBe(90 + 130 + 61);
    for (const d of data) expect(d.value).toBeLessThanOrEqual(60);
  });

  it("conserve les autres champs (hour, streams)", async () => {
    const data = await clockAfterToday(hours({ 4: 80 }));
    expect(data[4]).toMatchObject({ hour: "4h", streams: 1 });
  });

  it("ne modifie pas le tableau d'origine", async () => {
    const raw = hours({ 10: 75 });
    await clockAfterToday(raw);
    expect(raw[10].value).toBe(75);
  });

  it("ne plante pas quand les données horaires sont vides en mode 24h", async () => {
    const user = userEvent.setup();
    h.getDashboard.mockResolvedValue(makeStats());
    render(<Boundary><DashboardPage /></Boundary>);
    await screen.findByText(`${fmt(1234)} ${dict.unitMin}`);
    h.getDashboard.mockResolvedValue(makeStats({ clockData: [] }));
    await clickInterval(user, dict.today);
    await waitFor(() => expect(h.getDashboard).toHaveBeenCalledTimes(2));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(screen.queryByTestId("crashed")).toBeNull();
  });
});

describe("DashboardPage [id] : séries comblées (évolution et cumul)", () => {
  it("évolution : comble les jours manquants à zéro jusqu'à aujourd'hui et convertit en nombres", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "2026-09-29", streams: "5", minutes: "10" }],
    }));
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([
      { date: "2026-09-29", streams: 5, minutes: 10 },
      { date: "2026-09-30", streams: 0, minutes: 0 },
      { date: "2026-10-01", streams: 0, minutes: 0 },
    ]);
  });

  it("cumul : reporte la dernière valeur connue sur les jours manquants", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      cumulativeData: [
        { date: "2026-09-28", streams: 5, minutes: 10 },
        { date: "2026-09-30", streams: "8", minutes: "20" },
      ],
    }));
    await renderLoaded();
    expect(chartProps("chart-cumulative").data).toEqual([
      { date: "2026-09-28", streams: 5, minutes: 10 },
      { date: "2026-09-29", streams: 5, minutes: 10 },
      { date: "2026-09-30", streams: 8, minutes: 20 },
      { date: "2026-10-01", streams: 8, minutes: 20 },
    ]);
  });

  it("tableaux vides : les graphiques reçoivent un tableau vide", async () => {
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([]);
    expect(chartProps("chart-cumulative").data).toEqual([]);
  });

  it("valeurs null : les graphiques reçoivent un tableau vide sans erreur", async () => {
    h.getDashboard.mockResolvedValue(makeStats({ streamsEvolution: null, cumulativeData: null }));
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([]);
    expect(chartProps("chart-cumulative").data).toEqual([]);
  });

  it("première date invalide : tableau vide", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "n'importe quoi", streams: 1, minutes: 1 }],
      cumulativeData: [{ date: "n'importe quoi", streams: 1, minutes: 1 }],
    }));
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([]);
    expect(chartProps("chart-cumulative").data).toEqual([]);
  });

  it("première date dans le futur : tableau vide", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "2026-12-01", streams: 1, minutes: 1 }],
      cumulativeData: [{ date: "2026-12-01", streams: 1, minutes: 1 }],
    }));
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([]);
    expect(chartProps("chart-cumulative").data).toEqual([]);
  });

  it("un seul jour d'historique aujourd'hui donne une seule entrée", async () => {
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "2026-10-01", streams: 2, minutes: 3 }],
    }));
    await renderLoaded();
    expect(chartProps("chart-streams").data).toEqual([{ date: "2026-10-01", streams: 2, minutes: 3 }]);
  });

  it("mois passé : la série couvre exactement le mois choisi", async () => {
    const user = userEvent.setup();
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "2026-09-10", streams: 4, minutes: 8 }],
      cumulativeData: [{ date: "2026-09-10", streams: 4, minutes: 8 }],
    }));
    await renderLoaded();
    await clickInterval(user, dict.month);
    await user.click(minusButtons()[0]);
    await waitFor(() => {
      const data = chartProps("chart-streams").data;
      expect(data).toHaveLength(30);
      expect(data[0].date).toBe("2026-09-01");
      expect(data[29].date).toBe("2026-09-30");
    });
    const evo = chartProps("chart-streams").data;
    expect(evo[9]).toEqual({ date: "2026-09-10", streams: 4, minutes: 8 });
    expect(evo[0]).toEqual({ date: "2026-09-01", streams: 0, minutes: 0 });
    const cum = chartProps("chart-cumulative").data;
    expect(cum[8].streams).toBe(0);
    expect(cum[9].streams).toBe(4);
    expect(cum[29].streams).toBe(4);
  });

  it("mois en cours : la série s'arrête à aujourd'hui", async () => {
    const user = userEvent.setup();
    h.getDashboard.mockResolvedValue(makeStats({
      streamsEvolution: [{ date: "2026-10-01", streams: 1, minutes: 1 }],
    }));
    await renderLoaded();
    await clickInterval(user, dict.month);
    await waitFor(() => expect(chartProps("chart-streams").data).toEqual([{ date: "2026-10-01", streams: 1, minutes: 1 }]));
  });

  it("n'affiche pas de graphique d'évolution en mode 24h", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await clickInterval(user, dict.today);
    expect(screen.queryByTestId("chart-streams")).toBeNull();
  });
});

describe("DashboardPage [id] : concurrence des requêtes", () => {
  it("une réponse lente d'un ancien intervalle n'écrase pas la plus récente", async () => {
    const user = userEvent.setup();
    const first = deferred<any>();
    h.getDashboard.mockReturnValueOnce(first.promise);
    h.getDashboard.mockResolvedValue(makeStats({ totalTime: 777 }));
    render(<DashboardPage />);
    await clickInterval(user, dict.month);
    expect(await screen.findByText(`777 ${dict.unitMin}`)).toBeInTheDocument();
    await act(async () => {
      first.resolve(makeStats({ totalTime: 111 }));
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(screen.getByText(`777 ${dict.unitMin}`)).toBeInTheDocument();
    expect(screen.queryByText(`111 ${dict.unitMin}`)).toBeNull();
  });
});
