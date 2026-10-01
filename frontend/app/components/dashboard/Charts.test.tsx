import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { languages } from "../../constants/locales/lang";
import {
  AnnualChart,
  ClockChart,
  CumulativeChart,
  EvolutionChart,
  EvolutionStreamsChart,
  MonthlyChart,
  WeeklyChart,
} from "./Charts";

const t = languages.fr;

// --- Mocks -----------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const { captured, tooltip } = vi.hoisted(() => ({
  // Props reçues par chaque composant recharts (dernier rendu en dernier)
  captured: {} as Record<string, any[]>,
  // État simulé du Tooltip recharts
  tooltip: { active: true, payload: [] as any[] },
}));

vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

vi.mock("recharts", async () => {
  const React = await import("react");
  const record = (name: string, props: any) => {
    (captured[name] ??= []).push(props);
  };
  const container = (name: string) => {
    const C = (props: any) => {
      record(name, props);
      return <div data-testid={name} data-data={JSON.stringify(props.data)}>{props.children}</div>;
    };
    return C;
  };
  const leaf = (name: string) => {
    const C = (props: any) => {
      record(name, props);
      return <div data-testid={name} />;
    };
    return C;
  };
  return {
    ResponsiveContainer: ({ children, width, height }: any) => {
      record("ResponsiveContainer", { width, height });
      return <div data-testid="ResponsiveContainer">{children}</div>;
    },
    BarChart: container("BarChart"),
    LineChart: container("LineChart"),
    AreaChart: container("AreaChart"),
    RadarChart: container("RadarChart"),
    Bar: leaf("Bar"),
    Line: leaf("Line"),
    Area: leaf("Area"),
    Radar: leaf("Radar"),
    XAxis: leaf("XAxis"),
    YAxis: leaf("YAxis"),
    PolarAngleAxis: leaf("PolarAngleAxis"),
    PolarRadiusAxis: leaf("PolarRadiusAxis"),
    PolarGrid: leaf("PolarGrid"),
    CartesianGrid: leaf("CartesianGrid"),
    Legend: (props: any) => {
      record("Legend", props);
      return <div data-testid="Legend">{props.formatter?.("Titres")}</div>;
    },
    Tooltip: (props: any) => {
      record("Tooltip", props);
      return (
        <div data-testid="Tooltip">
          {React.cloneElement(props.content, { active: tooltip.active, payload: tooltip.payload })}
        </div>
      );
    },
  };
});

// --- Helpers ---------------------------------------------------------------

const last = (name: string) => captured[name][captured[name].length - 1];
const all = (name: string) => captured[name] ?? [];
const sampleData = [
  { day: "Lun", month: "Jan", year: "2024", hour: "0h", date: "2024-03-15", streams: 3, value: 12, minutes: 12, tracks: 4, albums: 2, artists: 1 },
  { day: "Mar", month: "Fév", year: "2025", hour: "1h", date: "2024-03-16", streams: 5, value: 20, minutes: 20, tracks: 6, albums: 3, artists: 2 },
];
const tooltipText = () => screen.getByTestId("Tooltip").textContent ?? "";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  for (const k of Object.keys(captured)) delete captured[k];
  tooltip.active = true;
  tooltip.payload = [];
});

// --- Tests -----------------------------------------------------------------

describe("Graphiques en barres (Weekly / Monthly / Annual)", () => {
  it.each([
    ["WeeklyChart", WeeklyChart, "day", t.charts.weekly],
    ["MonthlyChart", MonthlyChart, "month", t.charts.monthly],
    ["AnnualChart", AnnualChart, "year", t.charts.annual],
  ])("%s : titre, clé de l'axe X et données transmises", (_n, Chart, key, title) => {
    render(<Chart data={sampleData} metric="streams" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(title);
    expect(last("XAxis").dataKey).toBe(key);
    expect(JSON.parse(screen.getByTestId("BarChart").dataset.data!)).toEqual(sampleData);
  });

  it.each([
    ["streams", "streams"],
    ["minutes", "value"],
  ] as const)("métrique %s : la barre utilise dataKey=%s", (metric, dataKey) => {
    render(<WeeklyChart data={sampleData} metric={metric} />);
    expect(last("Bar").dataKey).toBe(dataKey);
  });

  it("affiche le titre et un message « aucune donnée » sans données (tableau vide)", () => {
    render(<WeeklyChart data={[]} metric="streams" />);
    expect(screen.queryByTestId("BarChart")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(t.charts.empty);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("utilise une hauteur de 250px sur grand écran et 200px sur petit écran", () => {
    vi.stubGlobal("innerWidth", 1280);
    const { container, unmount } = render(<WeeklyChart data={sampleData} metric="streams" />);
    expect((container.firstChild as HTMLElement).style.height).toBe("250px");
    unmount();

    vi.stubGlobal("innerWidth", 500);
    const small = render(<WeeklyChart data={sampleData} metric="streams" />);
    expect((small.container.firstChild as HTMLElement).style.height).toBe("200px");
    vi.stubGlobal("innerWidth", 1024);
  });

  it("formate les ticks de l'axe Y selon la locale (séparateur de milliers, sans décimales)", () => {
    render(<WeeklyChart data={sampleData} metric="streams" />);
    const out = last("YAxis").tickFormatter(1234567.89);
    // fr-FR : espace (fine) insécable comme séparateur
    expect(out.replace(/\s/g, " ")).toBe("1 234 568");
    expect(last("YAxis").tickFormatter(0)).toBe("0");
  });

  it("transmet un ResponsiveContainer à 100% et le même contenu de tooltip", () => {
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(last("ResponsiveContainer")).toEqual({ width: "100%", height: "100%" });
    expect(last("Bar").fill).toBe("#c084fc");
    expect(last("Bar").barSize).toBe(24);
  });
});

describe("CustomBar (forme des barres)", () => {
  const renderShape = (props: Record<string, unknown>) => {
    render(<WeeklyChart data={sampleData} metric="streams" />);
    const shape = last("Bar").shape;
    return render(<svg>{{ ...shape, props: { ...shape.props, ...props } }}</svg>);
  };

  it("dessine un rectangle violet quand la valeur est positive", () => {
    const { container } = renderShape({ x: 1, y: 2, width: 24, height: 50, value: 10 });
    const rect = container.querySelector("rect")!;
    expect(rect).toHaveAttribute("fill", "#c084fc");
    expect(rect).toHaveAttribute("height", "50");
    expect(rect).toHaveAttribute("rx", "6");
  });

  it("dessine une barre translucide quand la valeur est nulle", () => {
    const { container } = renderShape({ x: 1, y: 2, width: 24, height: 5, value: 0 });
    expect(container.querySelector("rect")).toHaveAttribute("fill", "#ffffff10");
  });

  it.each([[0], [undefined], [-3]])("ne dessine rien quand la hauteur vaut %s", (height) => {
    const { container } = renderShape({ x: 1, y: 2, width: 24, height, value: 10 });
    expect(container.querySelector("rect")).toBeNull();
  });
});

describe("CustomBar – valeur nulle", () => {
  const renderShape = (props: Record<string, unknown>) => {
    render(<WeeklyChart data={sampleData} metric="streams" />);
    const shape = last("Bar").shape;
    return render(<svg>{{ ...shape, props: { ...shape.props, ...props } }}</svg>);
  };

  it("dessine une barre minimale discrète posée sur la ligne de base quand la hauteur calculée est nulle", () => {
    const { container } = renderShape({ x: 1, y: 100, width: 24, height: 0, value: 0 });
    const rect = container.querySelector("rect")!;
    expect(rect).toHaveAttribute("fill", "#ffffff10");
    expect(Number(rect.getAttribute("height"))).toBeGreaterThan(0);
    // La barre se termine exactement sur la ligne de base (y + height = 100)
    expect(Number(rect.getAttribute("y")) + Number(rect.getAttribute("height"))).toBe(100);
    expect(rect).toHaveAttribute("width", "24");
  });
});

describe("État vide des graphiques", () => {
  it.each([
    ["WeeklyChart", () => <WeeklyChart data={[]} metric="streams" />],
    ["MonthlyChart", () => <MonthlyChart data={[]} metric="minutes" />],
    ["AnnualChart", () => <AnnualChart data={[]} metric="streams" />],
    ["ClockChart", () => <ClockChart data={[]} metric="streams" />],
    ["CumulativeChart", () => <CumulativeChart data={[]} />],
    ["EvolutionChart", () => <EvolutionChart data={[]} />],
    ["EvolutionStreamsChart", () => <EvolutionStreamsChart data={[]} />],
  ])("%s : message traduit et aucun graphique quand data est vide", (_n, ui) => {
    render(ui());
    expect(screen.getByRole("status")).toHaveTextContent(t.charts.empty);
    expect(screen.queryByTestId("ResponsiveContainer")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("affiche le message quand toutes les valeurs de la métrique sont nulles", () => {
    const zeros = [{ day: "Lun", streams: 0, value: 0 }, { day: "Mar", streams: 0, value: 0 }];
    render(<WeeklyChart data={zeros} metric="streams" />);
    expect(screen.getByRole("status")).toHaveTextContent(t.charts.empty);
  });

  it("considère la métrique affichée : des minutes non nulles suffisent pour la métrique minutes", () => {
    const data = [{ day: "Lun", streams: 0, value: 15 }];
    render(<WeeklyChart data={data} metric="minutes" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByTestId("BarChart")).toBeInTheDocument();
  });

  it("n'affiche pas le message quand au moins une valeur est non nulle", () => {
    render(<WeeklyChart data={[{ day: "Lun", streams: 0, value: 0 }, { day: "Mar", streams: 2, value: 0 }]} metric="streams" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("gère une valeur data undefined sans planter", () => {
    const Chart = WeeklyChart as any;
    render(<Chart metric="streams" />);
    expect(screen.getByRole("status")).toHaveTextContent(t.charts.empty);
  });
});

describe("Hauteur initiale (pas de saut desktop)", () => {
  it("rend la hauteur desktop (250px) sur grand écran, sans passer par la hauteur mobile", () => {
    vi.stubGlobal("innerWidth", 1280);
    const { container } = render(<WeeklyChart data={sampleData} metric="streams" />);
    expect((container.firstChild as HTMLElement).style.height).toBe("250px");
    vi.stubGlobal("innerWidth", 1024);
  });

  it("rend la hauteur serveur desktop (250px) par défaut avant mesure (renderToString)", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<WeeklyChart data={sampleData} metric="streams" />);
    expect(html).toContain("height:250px");
  });

  it("passe en hauteur mobile (200px) au redimensionnement", () => {
    vi.stubGlobal("innerWidth", 1280);
    const { container } = render(<WeeklyChart data={sampleData} metric="streams" />);
    act(() => {
      vi.stubGlobal("innerWidth", 500);
      window.dispatchEvent(new Event("resize"));
    });
    expect((container.firstChild as HTMLElement).style.height).toBe("200px");
    vi.stubGlobal("innerWidth", 1024);
  });
});

describe("ClockChart", () => {
  it("affiche le titre horaire et transmet les données au radar", () => {
    render(<ClockChart data={sampleData} metric="streams" daysCount={0} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(t.charts.hourly);
    expect(JSON.parse(screen.getByTestId("RadarChart").dataset.data!)).toEqual(sampleData);
    expect(last("PolarAngleAxis").dataKey).toBe("hour");
  });

  it.each([
    ["streams", "streams", t.common.streams],
    ["minutes", "value", t.common.minutes],
  ] as const)("métrique %s : dataKey=%s et nom traduit", (metric, dataKey, name) => {
    render(<ClockChart data={sampleData} metric={metric} daysCount={0} />);
    expect(last("Radar").dataKey).toBe(dataKey);
    expect(last("Radar").name).toBe(name);
  });

  it.each([
    ["minutes", 7, 420],
    ["minutes", 1, 60],
    ["minutes", 0, "auto"],
    ["streams", 7, "auto"],
  ] as const)("domaine radial (%s, %i jours) : [0, %s]", (metric, daysCount, max) => {
    render(<ClockChart data={sampleData} metric={metric} daysCount={daysCount} />);
    expect(last("PolarRadiusAxis").domain).toEqual([0, max]);
  });

  it("utilise la métrique 'streams' et 0 jour par défaut", () => {
    const Chart = ClockChart as any;
    render(<Chart data={sampleData} />);
    expect(last("Radar").dataKey).toBe("streams");
    expect(last("PolarRadiusAxis").domain).toEqual([0, "auto"]);
  });

  it.each([
    ["0h", "0h"],
    ["6h", "6h"],
    ["12h", "12h"],
    ["18h", "18h"],
    ["3h", ""],
    ["23h", ""],
    ["", ""],
  ])("formatTicks(%j) -> %j : seuls 0h/6h/12h/18h sont affichés", (input, expected) => {
    render(<ClockChart data={sampleData} metric="streams" daysCount={0} />);
    expect(last("PolarAngleAxis").tickFormatter(input)).toBe(expected);
  });

  it("utilise une hauteur adaptée à la largeur de l'écran", () => {
    vi.stubGlobal("innerWidth", 600);
    const { container } = render(<ClockChart data={sampleData} metric="streams" daysCount={0} />);
    expect((container.firstChild as HTMLElement).style.height).toBe("200px");
    vi.stubGlobal("innerWidth", 1024);
  });
});

describe("CumulativeChart", () => {
  it("affiche le titre, les données et deux aires (minutes puis streams)", () => {
    render(<CumulativeChart data={sampleData} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(t.charts.cumulative);
    expect(JSON.parse(screen.getByTestId("AreaChart").dataset.data!)).toEqual(sampleData);
    const areas = all("Area");
    expect(areas.map((a) => a.dataKey)).toEqual(["minutes", "streams"]);
    expect(areas.map((a) => a.stroke)).toEqual(["#1DD05D", "#065e25"]);
    expect(areas.map((a) => a.fill)).toEqual([expect.stringMatching(/^url\(#colorArea1-[\w-]+\)$/), expect.stringMatching(/^url\(#colorArea2-[\w-]+\)$/)]);
  });

  it("définit les deux dégradés référencés par les aires", () => {
    const { container } = render(<CumulativeChart data={sampleData} />);
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(ids).toHaveLength(2);
    const fills = all("Area").map((a) => a.fill as string);
    expect(fills).toEqual(ids.map((id) => `url(#${id})`));
  });

  it("utilise des ids de dégradé valides dans url(#...) (sans « : »)", () => {
    const { container } = render(<CumulativeChart data={sampleData} />);
    for (const g of Array.from(container.querySelectorAll("linearGradient"))) expect(g.id).toMatch(/^[\w-]+$/);
  });

  it("deux graphiques cumulés n'ont aucun id de dégradé en commun", () => {
    const { container } = render(<><CumulativeChart data={sampleData} /><CumulativeChart data={sampleData} /></>);
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("affiche légende et aires avec des données", () => {
    render(<CumulativeChart data={sampleData} />);
    expect(screen.getByTestId("Legend")).toBeInTheDocument();
  });
});

describe("EvolutionChart (découvertes)", () => {
  it("affiche trois lignes avec noms traduits et couleurs dédiées", () => {
    render(<EvolutionChart data={sampleData} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(t.charts.discoveries);
    const lines = all("Line");
    expect(lines.map((l) => l.dataKey)).toEqual(["tracks", "albums", "artists"]);
    expect(lines.map((l) => l.name)).toEqual([t.common.tracks, t.common.albums, t.common.artists]);
    expect(lines.map((l) => l.stroke)).toEqual(["#1DB954", "#60a5fa", "#a78bfa"]);
  });

  it("affiche la légende via le formatter (texte dans un span en gras)", () => {
    render(<EvolutionChart data={sampleData} />);
    const span = screen.getByTestId("Legend").querySelector("span")!;
    expect(span).toHaveTextContent("Titres");
    expect(span).toHaveClass("font-bold");
    expect(last("Legend")).toMatchObject({ iconType: "circle", verticalAlign: "top", align: "right" });
  });
});

describe("EvolutionStreamsChart", () => {
  it("affiche deux lignes minutes / streams", () => {
    render(<EvolutionStreamsChart data={sampleData} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(t.charts.streamsEvolution);
    const lines = all("Line");
    expect(lines.map((l) => l.dataKey)).toEqual(["minutes", "streams"]);
    expect(lines.map((l) => l.name)).toEqual([t.common.minutes, t.common.streams]);
    expect(lines.map((l) => l.stroke)).toEqual(["#1DD05D", "#065e25"]);
  });
});

describe("Axes partagés (GraphXAxis / GraphYAxis)", () => {
  it.each([
    ["CumulativeChart", () => <CumulativeChart data={sampleData} />],
    ["EvolutionChart", () => <EvolutionChart data={sampleData} />],
    ["EvolutionStreamsChart", () => <EvolutionStreamsChart data={sampleData} />],
  ])("%s : axe X sur 'date' avec ticks de date courts", (_n, ui) => {
    render(ui());
    const x = last("XAxis");
    expect(x.dataKey).toBe("date");
    expect(x.minTickGap).toBe(30);
    expect(x.tickFormatter("2024-03-15")).toBe("15/03/24");
  });

  it("formate les ticks Y avec séparateur de milliers", () => {
    render(<EvolutionChart data={sampleData} />);
    expect(last("YAxis").tickFormatter(12345).replace(/\s/g, " ")).toBe("12 345");
  });
});

describe("Tooltip personnalisé", () => {
  it("n'affiche rien quand le tooltip est inactif", () => {
    tooltip.active = false;
    tooltip.payload = [{ name: "streams", value: 3, payload: { date: "2024-03-15" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(tooltipText()).toBe("");
  });

  it.each([[[]], [undefined]])("n'affiche rien quand le payload est %j", (payload) => {
    tooltip.payload = payload as any;
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(tooltipText()).toBe("");
  });

  it("formate une date ISO selon la locale", () => {
    tooltip.payload = [{ name: "streams", value: 3, payload: { date: "2024-03-15" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(tooltipText()).toContain("15/03/2024");
  });

  it("formate aussi une date ISO avec heure", () => {
    tooltip.payload = [{ name: "streams", value: 3, payload: { full_date: "2024-03-15T12:00:00Z" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(tooltipText()).toContain("15/03/2024");
  });

  it.each([
    ["full_date", { full_date: "2024-03-15", date: "x", hour: "y" }, "15/03/2024"],
    ["date", { date: "2024-03-15", hour: "y" }, "15/03/2024"],
    ["hour", { hour: "14h", day: "Lun" }, "14h"],
    ["day", { day: "Lun", month: "Jan" }, "Lun"],
    ["month", { month: "Jan", year: "2024" }, "Jan"],
    ["year", { year: "2024" }, "2024"],
  ])("priorité de la clé de date : %s", (_k, payload, expected) => {
    tooltip.payload = [{ name: "streams", value: 1, payload }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(screen.getByTestId("Tooltip").querySelector("p")).toHaveTextContent(expected);
  });

  it("conserve l'étiquette brute quand elle n'est pas une date ISO", () => {
    tooltip.payload = [{ name: "streams", value: 1, payload: { month: "Fév" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(screen.getByTestId("Tooltip").querySelector("p")).toHaveTextContent(/^Fév$/);
  });

  it("n'affiche pas de date quand aucune clé n'est présente", () => {
    tooltip.payload = [{ name: "streams", value: 1, payload: {} }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(screen.getByTestId("Tooltip").querySelector("p")).toHaveTextContent(/^$/);
  });

  it.each([
    ["value", t.common.minutes],
    ["minutes", t.common.minutes],
    ["streams", t.common.streams],
    ["tracks", t.common.tracks],
    ["albums", t.common.albums],
    ["artists", t.common.artists],
    ["Nom libre", "Nom libre"],
  ])("traduit le nom de métrique %j en %j", (name, label) => {
    tooltip.payload = [{ name, value: 1, payload: { date: "2024-03-15" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    const rows = screen.getByTestId("Tooltip").querySelectorAll("p.font-mono");
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelectorAll("span")[1]).toHaveTextContent(label);
  });

  it("arrondit et sépare les milliers dans les valeurs", () => {
    tooltip.payload = [{ name: "streams", value: 1234567.6, payload: { date: "2024-03-15" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    const value = screen.getByTestId("Tooltip").querySelector("p.font-mono span")!;
    expect(value.textContent!.replace(/\s/g, " ")).toBe("1 234 568");
  });

  it("affiche une ligne par entrée du payload, colorée par color puis fill", () => {
    tooltip.payload = [
      { name: "tracks", value: 10, color: "#111111", payload: { date: "2024-03-15" } },
      { name: "albums", value: 20, fill: "#222222" },
      { name: "artists", value: 30, color: "#333333", fill: "#444444" },
    ];
    render(<EvolutionChart data={sampleData} />);
    const rows = screen.getByTestId("Tooltip").querySelectorAll("p.font-mono");
    expect(rows).toHaveLength(3);
    const labels = Array.from(rows).map((r) => r.querySelectorAll("span")[1] as HTMLElement);
    expect(labels.map((l) => l.style.color)).toEqual(["rgb(17, 17, 17)", "rgb(34, 34, 34)", "rgb(51, 51, 51)"]);
    expect(Array.from(rows).map((r) => r.querySelector("span")!.textContent)).toEqual(["10", "20", "30"]);
  });

  it("est utilisé comme contenu du tooltip de chaque graphique", () => {
    tooltip.payload = [{ name: "streams", value: 2, payload: { date: "2024-03-15" } }];
    const { unmount } = render(<CumulativeChart data={sampleData} />);
    expect(tooltipText()).toContain("15/03/2024");
    unmount();
    render(<ClockChart data={sampleData} metric="streams" daysCount={0} />);
    expect(tooltipText()).toContain("15/03/2024");
  });
});

describe("Effet sur la largeur d'écran", () => {
  it("lit window.innerWidth après le montage", async () => {
    vi.stubGlobal("innerWidth", 320);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<MonthlyChart data={[]} metric="minutes" />));
    });
    expect((container.firstChild as HTMLElement).style.height).toBe("200px");
    vi.stubGlobal("innerWidth", 1024);
  });
});

describe("Dates sans décalage de fuseau horaire", () => {
  const originalTZ = process.env.TZ;
  // Fuseau négatif : new Date("2024-01-01") (UTC) afficherait le 31/12/2023 en heure locale
  beforeEach(() => { process.env.TZ = "America/Los_Angeles"; });
  afterEach(() => { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; });

  it("le tooltip affiche le 1er janvier et non la veille", () => {
    tooltip.payload = [{ name: "streams", value: 3, payload: { date: "2024-01-01" } }];
    render(<WeeklyChart data={sampleData} metric="streams" />);
    expect(tooltipText()).toContain("01/01/2024");
    expect(tooltipText()).not.toContain("31/12/2023");
  });

  it("le tick de l'axe X affiche le 1er janvier et non la veille", () => {
    render(<CumulativeChart data={sampleData} />);
    expect(last("XAxis").tickFormatter("2024-01-01")).toBe("01/01/24");
  });

  it.each([
    ["2024-12-31", "31/12/24"],
    ["2024-03-10", "10/03/24"], // jour de changement d'heure aux États-Unis
    ["2024-02-29", "29/02/24"], // année bissextile
  ])("tick %s -> %s", (input, expected) => {
    render(<CumulativeChart data={sampleData} />);
    expect(last("XAxis").tickFormatter(input)).toBe(expected);
  });
});

describe("Redimensionnement de la fenêtre", () => {
  const heightOf = (container: HTMLElement) => (container.firstChild as HTMLElement).style.height;

  it("met à jour la hauteur du graphique quand la fenêtre est redimensionnée", async () => {
    vi.stubGlobal("innerWidth", 1280);
    let container!: HTMLElement;
    await act(async () => { ({ container } = render(<MonthlyChart data={[]} metric="minutes" />)); });
    expect(heightOf(container)).toBe("250px");

    vi.stubGlobal("innerWidth", 500);
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    expect(heightOf(container)).toBe("200px");

    vi.stubGlobal("innerWidth", 1400);
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    expect(heightOf(container)).toBe("250px");
    vi.stubGlobal("innerWidth", 1024);
  });

  it("met aussi à jour la hauteur du ClockChart", async () => {
    vi.stubGlobal("innerWidth", 1280);
    let container!: HTMLElement;
    await act(async () => { ({ container } = render(<ClockChart data={sampleData} />)); });
    expect(heightOf(container)).toBe("250px");
    vi.stubGlobal("innerWidth", 600);
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    expect(heightOf(container)).toBe("200px");
    vi.stubGlobal("innerWidth", 1024);
  });

  it("retire l'écouteur de redimensionnement au démontage", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    let unmount!: () => void;
    await act(async () => { ({ unmount } = render(<MonthlyChart data={[]} metric="minutes" />)); });
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    remove.mockRestore();
  });

  it("ClockChart s'affiche sans metric ni daysCount (valeurs par défaut)", () => {
    expect(() => render(<ClockChart data={sampleData} />)).not.toThrow();
  });
});
