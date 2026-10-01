import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import SidebarFilters from "./SidebarFilters";

const dict = languages.fr.sidebarFilters;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/my/tracks",
  search: "",
  ratingLabel: null as string | null, // libellé traduit du rating (null = celui du dictionnaire)
  cache: { key: null as string | null, params: null as unknown as URLSearchParams },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => h.pathname,
  // Référence stable tant que la query ne change pas (comme Next.js), sinon l'effet boucle
  useSearchParams: () => {
    if (h.cache.key !== h.search) h.cache = { key: h.search, params: new URLSearchParams(h.search) };
    return h.cache.params;
  },
}));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return {
    useLanguage: () => ({
      t: h.ratingLabel === null
        ? languages.fr
        : { ...languages.fr, sidebarFilters: { ...languages.fr.sidebarFilters, statRating: h.ratingLabel } },
      language: "fr",
      changeLanguage: vi.fn(),
    }),
  };
});

// --- Helpers ---------------------------------------------------------------

const fullConfig = () => ({
  search: { track: true, album: true, artist: true },
  stats: {
    streams: { min: 1, max: 500 },
    minutes: { min: 0, max: 1000 },
    engagement: { min: 0, max: 100 },
    rating: { min: 0, max: 10 },
  },
});

let toggle: Mock<() => void>;

const renderSidebar = (props: Record<string, unknown> = {}) =>
  render(<SidebarFilters config={fullConfig()} loading={false} isVisible toggleShowFilters={toggle} {...props} />);

const applyBtn = () => screen.getByRole("button", { name: new RegExp(`${dict.apply}|${dict.loading}`) });
const resetBtn = () => screen.getByRole("button", { name: dict.reset });
const sliders = () => screen.getAllByRole("slider") as HTMLInputElement[];
const dateInputs = (container: HTMLElement) => container.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
const setWidth = (w: number) => Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true });

beforeEach(() => {
  vi.clearAllMocks();
  h.pathname = "/my/tracks";
  h.search = "";
  h.ratingLabel = null;
  toggle = vi.fn<() => void>();
  setWidth(1280);
});

// --- Tests -----------------------------------------------------------------

describe("SidebarFilters – rendu", () => {
  it("affiche le titre, le bouton d'application et le bouton de réinitialisation", () => {
    renderSidebar();
    expect(screen.getByRole("heading", { name: dict.title })).toBeInTheDocument();
    expect(applyBtn()).toHaveTextContent(dict.apply);
    expect(resetBtn()).toBeInTheDocument();
  });

  it("affiche les trois groupes (recherche, statistiques, période)", () => {
    renderSidebar();
    for (const g of [dict.searchGroup, dict.statsGroup, dict.periodGroup]) {
      expect(screen.getByRole("button", { name: new RegExp(g) })).toBeInTheDocument();
    }
  });

  it("désactive le bouton d'application et affiche « Chargement... » pendant le chargement", () => {
    renderSidebar({ loading: true });
    expect(applyBtn()).toBeDisabled();
    expect(applyBtn()).toHaveTextContent(dict.loading);
  });

  it("n'applique pas les filtres quand le bouton est désactivé", async () => {
    const user = userEvent.setup();
    renderSidebar({ loading: true });
    await user.click(applyBtn());
    expect(h.push).not.toHaveBeenCalled();
  });

  it("affiche les quatre champs de recherche/statistiques selon la config complète", () => {
    const { container } = renderSidebar();
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(dict.placeholderAlbum)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(dict.placeholderArtist)).toBeInTheDocument();
    for (const l of [dict.statStreams, dict.statMinutes, dict.statEngagement, dict.statRating]) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
    expect(sliders()).toHaveLength(8);
    expect(dateInputs(container)).toHaveLength(2);
    expect(screen.getByText(dict.dateFrom)).toBeInTheDocument();
    expect(screen.getByText(dict.dateTo)).toBeInTheDocument();
  });

  it("masque le groupe de recherche quand config.search est absent", () => {
    renderSidebar({ config: { stats: fullConfig().stats } });
    expect(screen.queryByRole("button", { name: new RegExp(dict.searchGroup) })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(dict.placeholderTrack)).not.toBeInTheDocument();
  });

  it.each([
    ["track", dict.placeholderTrack],
    ["album", dict.placeholderAlbum],
    ["artist", dict.placeholderArtist],
  ])("n'affiche que le champ de recherche « %s » quand il est le seul activé", (key, placeholder) => {
    renderSidebar({ config: { ...fullConfig(), search: { [key]: true } } });
    expect(screen.getAllByPlaceholderText(/\.\.\.$/)).toHaveLength(1);
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it("n'affiche que les statistiques présentes dans la config", () => {
    renderSidebar({ config: { search: {}, stats: { minutes: { min: 0, max: 60 } } } });
    expect(screen.getByText(dict.statMinutes)).toBeInTheDocument();
    expect(screen.queryByText(dict.statStreams)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.statRating)).not.toBeInTheDocument();
    expect(sliders()).toHaveLength(2);
  });

  it("applique les bornes min/max de la config aux curseurs", () => {
    renderSidebar({ config: { search: {}, stats: { streams: { min: 3, max: 250 } } } });
    for (const s of sliders()) {
      expect(s).toHaveAttribute("min", "3");
      expect(s).toHaveAttribute("max", "250");
    }
  });

  it("utilise un pas de 1 pour les streams et 0,05 pour le rating", () => {
    renderSidebar();
    const all = sliders();
    expect(all[0]).toHaveAttribute("step", "1");
    expect(all[6]).toHaveAttribute("step", "0.05");
    expect(all[7]).toHaveAttribute("step", "0.05");
  });

  it("utilise un pas de 1 pour les minutes et l'engagement", () => {
    renderSidebar();
    const all = sliders();
    for (const i of [2, 3, 4, 5]) expect(all[i]).toHaveAttribute("step", "1");
  });

  it("garde le pas de 0,05 du rating quand le libellé est traduit (le pas ne dépend pas du texte)", () => {
    h.ratingLabel = "Note";
    renderSidebar();
    expect(screen.getByText("Note")).toBeInTheDocument();
    const all = sliders();
    expect(all[6]).toHaveAttribute("step", "0.05");
    expect(all[7]).toHaveAttribute("step", "0.05");
    expect(all[0]).toHaveAttribute("step", "1");
  });

  it("affiche l'unité % uniquement pour l'engagement", () => {
    renderSidebar();
    const pct = screen.getAllByText(/%$/);
    expect(pct).toHaveLength(1);
    expect(pct[0]).toHaveTextContent("0 ⟷ 100%");
  });

  it("formate les valeurs selon la locale française", () => {
    renderSidebar({ config: { search: {}, stats: { streams: { min: 1, max: 12345 } } } });
    const text = document.body.textContent!.replace(/[  ]/g, " ");
    expect(text).toContain("1 ⟷ 12 345");
  });
});

describe("SidebarFilters – visibilité", () => {
  it("expose l'aside et l'overlay visibles quand isVisible est vrai", () => {
    const { container } = renderSidebar({ isVisible: true });
    expect(container.querySelector("aside")).toHaveClass("translate-x-0");
    expect(container.querySelector("aside")).not.toHaveClass("-translate-x-full");
    expect(container.firstElementChild).toHaveClass("opacity-100");
  });

  it("masque l'aside et neutralise l'overlay quand isVisible est faux", () => {
    const { container } = renderSidebar({ isVisible: false });
    expect(container.querySelector("aside")).toHaveClass("-translate-x-full");
    expect(container.firstElementChild).toHaveClass("pointer-events-none");
  });

  it("appelle toggleShowFilters au clic sur l'overlay", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();
    await user.click(container.firstElementChild as HTMLElement);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});

describe("SidebarFilters – groupes repliables", () => {
  it("affiche « − » quand un groupe est ouvert et « + » une fois replié", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const btn = screen.getByRole("button", { name: new RegExp(dict.searchGroup) });
    expect(btn).toHaveTextContent("−");
    await user.click(btn);
    expect(btn).toHaveTextContent("+");
    await user.click(btn);
    expect(btn).toHaveTextContent("−");
  });

  it("replie le contenu du groupe (classes de hauteur nulle)", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const btn = screen.getByRole("button", { name: new RegExp(dict.periodGroup) });
    const content = btn.nextElementSibling as HTMLElement;
    expect(content).toHaveClass("max-h-[500px]");
    await user.click(btn);
    expect(content).toHaveClass("max-h-0");
    expect(content).toHaveClass("opacity-0");
  });

  it("replier un groupe ne le démonte pas et conserve les valeurs saisies", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderTrack), "abc");
    await user.click(screen.getByRole("button", { name: new RegExp(dict.searchGroup) }));
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("abc");
  });

  it("les groupes se replient indépendamment", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: new RegExp(dict.searchGroup) }));
    expect(screen.getByRole("button", { name: new RegExp(dict.statsGroup) })).toHaveTextContent("−");
    expect(screen.getByRole("button", { name: new RegExp(dict.periodGroup) })).toHaveTextContent("−");
  });
});

describe("SidebarFilters – initialisation depuis l'URL", () => {
  it("pré-remplit les champs de recherche et les dates depuis les paramètres", () => {
    h.search = "track=Numb&album=Meteora&artist=Linkin&date_min=2024-01-01&date_max=2024-12-31";
    const { container } = renderSidebar();
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Numb");
    expect(screen.getByPlaceholderText(dict.placeholderAlbum)).toHaveValue("Meteora");
    expect(screen.getByPlaceholderText(dict.placeholderArtist)).toHaveValue("Linkin");
    const [from, to] = Array.from(dateInputs(container));
    expect(from).toHaveValue("2024-01-01");
    expect(to).toHaveValue("2024-12-31");
  });

  it("positionne les curseurs sur les valeurs de l'URL", () => {
    h.search = "streams_min=50&streams_max=200";
    renderSidebar();
    const [min, max] = sliders();
    expect(min).toHaveValue("50");
    expect(max).toHaveValue("200");
    expect(screen.getByText("50 ⟷ 200")).toBeInTheDocument();
  });

  it("retombe sur les bornes de la config quand l'URL n'a pas de valeur", () => {
    renderSidebar();
    const [min, max] = sliders();
    expect(min).toHaveValue("1");
    expect(max).toHaveValue("500");
  });

  it("prend en compte une valeur 0 de l'URL même quand la borne min de la config est supérieure", () => {
    h.search = "streams_min=0";
    renderSidebar();
    expect(sliders()[0]).toHaveValue("1"); // borné par min=1 du curseur, mais la valeur lue est bien 0 et non la borne
    expect(screen.getByText(/^0 ⟷ 500/)).toBeInTheDocument();
  });

  it("ignore une valeur d'URL non numérique pour un curseur", () => {
    h.search = "streams_min=abc";
    renderSidebar();
    expect(sliders()[0]).toHaveValue("1");
  });

  it("conserve les paramètres inconnus de l'URL lors de l'application", async () => {
    const user = userEvent.setup();
    h.search = "sort=streams&order=desc";
    renderSidebar();
    await user.click(applyBtn());
    expect(h.push).toHaveBeenCalledWith("/my/tracks?sort=streams&order=desc", { scroll: false });
  });
});

describe("SidebarFilters – saisie et application", () => {
  it("met à jour les champs de recherche à la frappe sans toucher à l'URL", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderTrack), "Numb");
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Numb");
    expect(h.push).not.toHaveBeenCalled();
  });

  it("pousse l'URL avec tous les filtres saisis au clic sur « Appliquer »", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderTrack), "Numb");
    await user.type(screen.getByPlaceholderText(dict.placeholderAlbum), "Meteora");
    await user.type(screen.getByPlaceholderText(dict.placeholderArtist), "Linkin Park");
    fireEvent.change(dateInputs(container)[0], { target: { value: "2024-01-01" } });
    fireEvent.change(dateInputs(container)[1], { target: { value: "2024-06-30" } });
    await user.click(applyBtn());

    expect(h.push).toHaveBeenCalledTimes(1);
    const [url, opts] = h.push.mock.calls[0];
    const [path, query] = url.split("?");
    const params = new URLSearchParams(query);
    expect(path).toBe("/my/tracks");
    expect(Object.fromEntries(params)).toEqual({
      track: "Numb",
      album: "Meteora",
      artist: "Linkin Park",
      date_min: "2024-01-01",
      date_max: "2024-06-30",
    });
    expect(opts).toEqual({ scroll: false });
  });

  it("encode correctement les caractères spéciaux", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderArtist), "AC/DC & co");
    await user.click(applyBtn());
    const [url] = h.push.mock.calls[0];
    expect(new URLSearchParams(url.split("?")[1]).get("artist")).toBe("AC/DC & co");
    expect(url).not.toContain("& co");
  });

  it("omet les champs vidés de l'URL", async () => {
    const user = userEvent.setup();
    h.search = "track=Numb&album=Meteora";
    renderSidebar();
    await user.clear(screen.getByPlaceholderText(dict.placeholderTrack));
    await user.click(applyBtn());
    expect(h.push).toHaveBeenCalledWith("/my/tracks?album=Meteora", { scroll: false });
  });

  it("pousse l'URL sans paramètres quand aucun filtre n'est saisi", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(applyBtn());
    expect(h.push).toHaveBeenCalledWith("/my/tracks", { scroll: false });
  });

  it("n'ajoute jamais de « ? » orphelin à l'URL", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(applyBtn());
    expect(h.push.mock.calls[0][0]).not.toMatch(/\?$/);
  });

  it("utilise le chemin courant pour construire l'URL", async () => {
    const user = userEvent.setup();
    h.pathname = "/all/artists";
    renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderArtist), "x");
    await user.click(applyBtn());
    expect(h.push).toHaveBeenCalledWith("/all/artists?artist=x", { scroll: false });
  });

  it("met à jour l'URL avec les bornes choisies sur les curseurs", async () => {
    const user = userEvent.setup();
    renderSidebar();
    fireEvent.change(sliders()[0], { target: { value: "20" } });
    fireEvent.change(sliders()[1], { target: { value: "300" } });
    await user.click(applyBtn());
    const params = new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]);
    expect(params.get("streams_min")).toBe("20");
    expect(params.get("streams_max")).toBe("300");
    expect(params.has("minutes_min")).toBe(false);
  });

  it("se resynchronise quand les paramètres d'URL changent", () => {
    h.search = "track=Numb";
    const { rerender } = renderSidebar();
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Numb");
    h.search = "track=Faint";
    rerender(<SidebarFilters config={fullConfig()} loading={false} isVisible toggleShowFilters={toggle} />);
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Faint");
  });
});

describe("SidebarFilters – changements d'URL étrangers aux filtres", () => {
  const rerenderSidebar = (rerender: (ui: React.ReactElement) => void) =>
    rerender(<SidebarFilters config={fullConfig()} loading={false} isVisible toggleShowFilters={toggle} />);

  it("conserve les saisies non appliquées quand seul le tri ou l'offset change dans l'URL", async () => {
    const user = userEvent.setup();
    h.search = "track=Numb&sort=streams";
    const { rerender } = renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderAlbum), "Meteora");
    h.search = "track=Numb&sort=minutes&offset=50";
    rerenderSidebar(rerender);
    expect(screen.getByPlaceholderText(dict.placeholderAlbum)).toHaveValue("Meteora");
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Numb");
  });

  it("reprend le tri courant de l'URL (et non un ancien) à l'application", async () => {
    const user = userEvent.setup();
    h.search = "sort=streams";
    const { rerender } = renderSidebar();
    h.search = "sort=minutes";
    rerenderSidebar(rerender);
    await user.type(screen.getByPlaceholderText(dict.placeholderTrack), "Numb");
    await user.click(applyBtn());
    const params = new URLSearchParams(h.push.mock.calls[0][0].split("?")[1]);
    expect(params.get("sort")).toBe("minutes");
    expect(params.get("track")).toBe("Numb");
  });

  it("écrase la saisie locale quand un paramètre de filtre change réellement dans l'URL", async () => {
    const user = userEvent.setup();
    h.search = "track=Numb";
    const { rerender } = renderSidebar();
    await user.type(screen.getByPlaceholderText(dict.placeholderAlbum), "Meteora");
    h.search = "track=Faint&sort=minutes";
    rerenderSidebar(rerender);
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Faint");
    expect(screen.getByPlaceholderText(dict.placeholderAlbum)).toHaveValue("");
  });
});

describe("SidebarFilters – fermeture sur mobile", () => {
  it("referme la sidebar après application sur un écran < 1024px", async () => {
    const user = userEvent.setup();
    setWidth(800);
    renderSidebar();
    await user.click(applyBtn());
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("laisse la sidebar ouverte après application sur un écran large", async () => {
    const user = userEvent.setup();
    setWidth(1280);
    renderSidebar();
    await user.click(applyBtn());
    expect(toggle).not.toHaveBeenCalled();
  });

  it("considère 1024px comme un écran large", async () => {
    const user = userEvent.setup();
    setWidth(1024);
    renderSidebar();
    await user.click(applyBtn());
    expect(toggle).not.toHaveBeenCalled();
  });

  it("referme la sidebar à la réinitialisation sur mobile", async () => {
    const user = userEvent.setup();
    setWidth(500);
    renderSidebar();
    await user.click(resetBtn());
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("laisse la sidebar ouverte à la réinitialisation sur un écran large", async () => {
    const user = userEvent.setup();
    setWidth(1280);
    renderSidebar();
    await user.click(resetBtn());
    expect(toggle).not.toHaveBeenCalled();
  });
});

describe("SidebarFilters – réinitialisation", () => {
  it("vide tous les champs et renvoie vers le chemin sans paramètres", async () => {
    const user = userEvent.setup();
    h.search = "track=Numb&date_min=2024-01-01&streams_min=50";
    const { container } = renderSidebar();
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("Numb");
    await user.click(resetBtn());
    expect(screen.getByPlaceholderText(dict.placeholderTrack)).toHaveValue("");
    expect(dateInputs(container)[0]).toHaveValue("");
    expect(sliders()[0]).toHaveValue("1");
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith("/my/tracks", { scroll: false });
  });

  it("la réinitialisation écrase aussi les paramètres inconnus au prochain « Appliquer »", async () => {
    const user = userEvent.setup();
    h.search = "sort=streams";
    const { rerender } = renderSidebar();
    await user.click(resetBtn());
    // L'URL est vidée par la navigation de la réinitialisation
    h.search = "";
    rerender(<SidebarFilters config={fullConfig()} loading={false} isVisible toggleShowFilters={toggle} />);
    await user.click(applyBtn());
    expect(h.push).toHaveBeenLastCalledWith("/my/tracks", { scroll: false });
  });
});

describe("SidebarFilters – curseurs à double borne", () => {
  it("le curseur min ne peut pas dépasser la borne max courante", () => {
    h.search = "streams_min=10&streams_max=100";
    renderSidebar();
    fireEvent.change(sliders()[0], { target: { value: "400" } });
    expect(sliders()[0]).toHaveValue("100");
    expect(screen.getByText("100 ⟷ 100")).toBeInTheDocument();
  });

  it("le curseur max ne peut pas descendre sous la borne min courante", () => {
    h.search = "streams_min=50&streams_max=200";
    renderSidebar();
    fireEvent.change(sliders()[1], { target: { value: "5" } });
    expect(sliders()[1]).toHaveValue("50");
    expect(screen.getByText("50 ⟷ 50")).toBeInTheDocument();
  });

  it("met à jour l'étiquette de valeurs quand un curseur bouge", () => {
    renderSidebar({ config: { search: {}, stats: { streams: { min: 0, max: 100 } } } });
    fireEvent.change(sliders()[0], { target: { value: "30" } });
    expect(screen.getByText("30 ⟷ 100")).toBeInTheDocument();
  });

  it("supporte les valeurs décimales pour le rating", () => {
    h.search = "rating_min=2.5&rating_max=7.25";
    renderSidebar();
    expect(screen.getByText(/2,5 ⟷\s*7,25/)).toBeInTheDocument();
  });
});
