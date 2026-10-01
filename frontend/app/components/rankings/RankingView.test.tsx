import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { languages } from "../../constants/locales/lang";
import RankingView from "./RankingView";

const dict = languages.fr.ranking;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  viewMode: "grid" as string,
  toggleViewMode: vi.fn(),
  showFilters: false,
  toggleShowFilters: vi.fn(),
  sidebar: vi.fn(),
  instances: 0,
}));

vi.mock("../../context/viewModeContext", () => ({
  useViewMode: () => ({ viewMode: h.viewMode, toggleViewMode: h.toggleViewMode }),
}));
vi.mock("../../context/showFiltersContext", () => ({
  useShowFilters: () => ({ showFilters: h.showFilters, toggleShowFilters: h.toggleShowFilters }),
}));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("../SidebarFilters", () => ({
  default: (props: Record<string, unknown>) => {
    h.sidebar(props);
    return <aside data-testid="sidebar" />;
  },
}));
vi.mock("lucide-react", () => ({
  Grid3X3: () => <svg data-testid="icon-grid_sm" />,
  Grid2X2: () => <svg data-testid="icon-grid" />,
  List: () => <svg data-testid="icon-list" />,
}));

// Les cellules ont leurs propres tests : ici de simples stubs qui exposent leurs props.
// `instance` permet de vérifier qu'une cellule est conservée (clé stable) d'un rendu à l'autre.
function makeCell(kind: string) {
  return function Cell({ element, index, sort }: { element: { title?: string; name?: string; type: string }; index: number; sort: string }) {
    const [instance] = useState(() => ++h.instances);
    return (
      <div data-testid={`cell-${kind}`} data-instance={instance} data-index={index} data-sort={sort} data-type={element.type}>
        {element.title ?? element.name}
      </div>
    );
  };
}
vi.mock("./GridCell", () => ({ default: makeCell("grid") }));
vi.mock("./ListCell", () => ({ default: makeCell("list") }));
vi.mock("./SmallGridCell", () => ({ default: makeCell("grid_sm") }));

// --- Helpers ---------------------------------------------------------------

type Props = React.ComponentProps<typeof RankingView>;

const item = (n: number, extra: Record<string, unknown> = {}) => ({ id: n, title: `Titre ${n}`, ...extra });

const baseProps = (): Props => ({
  title: "Tous mes",
  type: "track",
  items: [item(1), item(2), item(3)],
  sortConfig: { sort: "play_count", direction: "desc" },
  onSort: vi.fn(),
  loading: false,
  hasMore: false,
  loadMore: vi.fn(),
  filterConfig: { foo: "bar" },
});

const renderView = (over: Partial<Props> = {}) => {
  const props = { ...baseProps(), ...over };
  return { props, ...render(<RankingView {...props} />) };
};

const instances = () => screen.getAllByTestId(/^cell-/).map((c) => c.getAttribute("data-instance"));

beforeEach(() => {
  vi.clearAllMocks();
  h.viewMode = "grid";
  h.showFilters = false;
  h.instances = 0;
});

// --- Tests -----------------------------------------------------------------

describe("RankingView – en-tête", () => {
  it.each([
    ["track", dict.types.track],
    ["album", dict.types.album],
    ["artist", dict.types.artist],
  ] as const)("affiche le titre et le type %s", (type, label) => {
    renderView({ type, title: "Tous les" });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(`Tous les ${label}`);
  });

  it("affiche un <main> contenant le contenu", () => {
    renderView();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});

describe("RankingView – filtres", () => {
  it("transmet config, loading et visibilité à la barre latérale", () => {
    renderView({ loading: true, filterConfig: { a: 1 } });
    expect(h.sidebar).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: { a: 1 }, loading: true, isVisible: false, toggleShowFilters: h.toggleShowFilters }),
    );
  });

  it("filtres masqués : bouton « Filtres » qui ouvre le panneau", async () => {
    const user = userEvent.setup();
    renderView();
    const btn = screen.getByRole("button", { name: new RegExp(dict.filterBtn) });
    expect(screen.queryByRole("button", { name: new RegExp(dict.closeBtn) })).not.toBeInTheDocument();
    await user.click(btn);
    expect(h.toggleShowFilters).toHaveBeenCalledTimes(1);
  });

  it("filtres visibles : bouton « Fermer » qui ferme le panneau", async () => {
    h.showFilters = true;
    const user = userEvent.setup();
    renderView();
    expect(screen.queryByRole("button", { name: new RegExp(dict.filterBtn) })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: new RegExp(dict.closeBtn) }));
    expect(h.toggleShowFilters).toHaveBeenCalledTimes(1);
    expect(h.sidebar).toHaveBeenLastCalledWith(expect.objectContaining({ isVisible: true }));
  });
});

describe("RankingView – tri", () => {
  it("affiche la liste des options de tri, le libellé et la valeur courante", () => {
    renderView({ sortConfig: { sort: "rating", direction: "desc" } });
    expect(screen.getByText(dict.sortBy)).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("rating");
    const labels = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(Object.values(dict.sortOptions));
  });

  it.each([
    ["track", "title"],
    ["album", "name"],
    ["artist", "name"],
  ] as const)("l'option « Nom » trie sur la clé adaptée au type %s", (type, key) => {
    renderView({ type });
    expect(screen.getByRole("option", { name: dict.sortOptions.name })).toHaveValue(key);
  });

  it("appelle onSort avec la clé choisie", async () => {
    const user = userEvent.setup();
    const { props } = renderView();
    await user.selectOptions(screen.getByRole("combobox"), "total_minutes");
    expect(props.onSort).toHaveBeenCalledTimes(1);
    expect(props.onSort).toHaveBeenCalledWith("total_minutes");
  });

  it("le bouton de direction rappelle onSort avec le tri courant", async () => {
    const user = userEvent.setup();
    const { props } = renderView({ sortConfig: { sort: "engagement", direction: "desc" } });
    await user.click(screen.getByRole("button", { name: "⇅" }));
    expect(props.onSort).toHaveBeenCalledWith("engagement");
  });

  it("retourne la flèche uniquement en ordre croissant", () => {
    const { unmount } = renderView({ sortConfig: { sort: "play_count", direction: "desc" } });
    expect(screen.getByText("⇅")).not.toHaveClass("rotate-180");
    unmount();
    renderView({ sortConfig: { sort: "play_count", direction: "asc" } });
    expect(screen.getByText("⇅")).toHaveClass("rotate-180");
  });
});

const trigger = () => screen.getByRole("button", { expanded: false }) as HTMLButtonElement;
const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^(Grille|Petite grille|Liste)$/, expanded: false }));
};
const menuButton = (icon: string) => screen.getAllByTestId(icon).map((i) => i.closest("button")!).find((b) => b.className.includes("w-full"))!;

describe("RankingView – modes d'affichage", () => {
  it.each([
    ["grid", "cell-grid", "grid-cols-3"],
    ["grid_sm", "cell-grid_sm", "grid-cols-5"],
    ["list", "cell-list", "space-y-2.5"],
  ])("mode %s : utilise la bonne cellule et le bon conteneur", (mode, testId, cls) => {
    h.viewMode = mode;
    renderView();
    const cells = screen.getAllByTestId(testId);
    expect(cells).toHaveLength(3);
    expect(screen.getAllByTestId(/^cell-/)).toHaveLength(3);
    expect(cells[0].parentElement).toHaveClass(cls);
  });

  it.each([
    ["grid", dict.viewGrid],
    ["grid_sm", dict.viewGridSm],
    ["list", dict.viewList],
  ])("mode %s : le bouton de vue (menu fermé) a pour nom accessible « %s »", (mode, label) => {
    h.viewMode = mode;
    renderView();
    expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
  });

  it("mode inconnu : retombe sur la grille standard", () => {
    h.viewMode = "bizarre";
    renderView();
    expect(screen.getAllByTestId("cell-grid")).toHaveLength(3);
  });

  it("mode inconnu : l'icône active est celle de la grille", () => {
    h.viewMode = "bizarre";
    renderView();
    expect(screen.getAllByTestId("icon-grid")).toHaveLength(1);
  });

  it.each([
    ["grid_sm", "icon-grid_sm"],
    ["grid", "icon-grid"],
    ["list", "icon-list"],
  ])("le bouton de vue affiche l'icône du mode %s", (mode, icon) => {
    h.viewMode = mode;
    renderView();
    expect(screen.getAllByTestId(/^icon-/).map((i) => i.getAttribute("data-testid"))).toEqual([icon]);
  });
});

describe("RankingView – menu de changement de vue", () => {
  it("est fermé au départ : bouton annoncé comme menu replié, aucune option affichée", () => {
    renderView();
    const btn = trigger();
    expect(btn).toHaveAttribute("aria-haspopup", "true");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("button", { name: dict.viewGrid })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
  });

  it("ne s'ouvre pas au simple survol", async () => {
    const user = userEvent.setup();
    renderView();
    await user.hover(trigger());
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
  });

  it("s'ouvre au clic et expose les trois choix de vue", async () => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    expect(screen.getByRole("button", { name: dict.viewGrid, expanded: true })).toHaveAttribute("aria-haspopup", "true");
    for (const label of [dict.viewGridSm, dict.viewList]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: dict.viewGrid })).toHaveLength(2);
  });

  it.each([["{Enter}"], [" "]])("s'ouvre au clavier (touche %j) et les options sont atteignables par Tab", async (key) => {
    const user = userEvent.setup();
    renderView();
    trigger().focus();
    await user.keyboard(key);
    expect(screen.getByRole("button", { name: dict.viewList })).toBeInTheDocument();
    await user.tab();
    expect(menuButton("icon-grid_sm")).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: dict.viewGridSm }).closest("button"));
  });

  it("un second clic sur le bouton referme le menu", async () => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    await user.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    ["icon-grid_sm", "grid_sm"],
    ["icon-list", "list"],
  ])("choisir l'entrée %s passe en mode %s et ferme le menu", async (icon, mode) => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    await user.click(menuButton(icon));
    expect(h.toggleViewMode).toHaveBeenCalledTimes(1);
    expect(h.toggleViewMode).toHaveBeenCalledWith(mode);
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("choisir la vue déjà active ferme aussi le menu", async () => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    await user.click(menuButton("icon-grid"));
    expect(h.toggleViewMode).toHaveBeenCalledWith("grid");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("se ferme avec Échap et rend le focus au bouton", async () => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    await user.tab();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger());
  });

  it("Échap sans menu ouvert ne fait rien", async () => {
    const user = userEvent.setup();
    renderView();
    trigger().focus();
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("se ferme au clic en dehors du menu, mais pas au clic dedans sur le bouton", async () => {
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    await user.click(screen.getByRole("main"));
    expect(screen.queryByRole("button", { name: dict.viewList })).not.toBeInTheDocument();
    expect(h.toggleViewMode).not.toHaveBeenCalled();
  });

  it("met en évidence l'entrée du mode courant et masque la petite grille sur mobile", async () => {
    h.viewMode = "list";
    const user = userEvent.setup();
    renderView();
    await openMenu(user);
    expect(menuButton("icon-list")).toHaveClass("text2", "bg-white/5");
    expect(menuButton("icon-grid")).toHaveClass("text3");
    expect(menuButton("icon-grid_sm")).toHaveClass("hidden", "lg:flex");
    expect(menuButton("icon-grid")).toHaveClass("flex");
    expect(menuButton("icon-grid")).not.toHaveClass("hidden");
  });

  it("retire ses écouteurs globaux au démontage", async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderView();
    await openMenu(user);
    unmount();
    expect(remove).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    remove.mockRestore();
  });
});

describe("RankingView – éléments", () => {
  it("transmet élément (type injecté), index et tri à chaque cellule", () => {
    renderView({ type: "album", items: [{ id: "x", name: "A" }, { id: "y", name: "B", type: "track" }], sortConfig: { sort: "rating", direction: "asc" } });
    const cells = screen.getAllByTestId("cell-grid");
    expect(cells.map((c) => c.getAttribute("data-index"))).toEqual(["0", "1"]);
    expect(cells.map((c) => c.getAttribute("data-sort"))).toEqual(["rating", "rating"]);
    // le type de la vue écrase celui de l'élément
    expect(cells.map((c) => c.getAttribute("data-type"))).toEqual(["album", "album"]);
    expect(cells.map((c) => c.textContent)).toEqual(["A", "B"]);
  });

  it("n'affiche aucune cellule pour une liste vide", () => {
    renderView({ items: [] });
    expect(screen.queryByTestId("cell-grid")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("ne modifie pas le tableau d'items reçu", () => {
    const items = [item(1)];
    renderView({ items });
    expect(items[0]).not.toHaveProperty("type");
  });

  it("conserve les cellules existantes quand de nouveaux éléments sont ajoutés (clé stable)", () => {
    const { rerender, props } = renderView({ items: [item(1), item(2)] });
    const before = instances();
    rerender(<RankingView {...props} items={[item(1), item(2), item(3)]} />);
    expect(instances().slice(0, 2)).toEqual(before);
    expect(instances()).toHaveLength(3);
  });

  it("n'utilise plus le spotify_id d'un ancien format comme clé : seul l'id interne compte", () => {
    const a = item(1, { spotify_id: "meme" });
    const b = item(2, { spotify_id: "meme" });
    const { rerender, props } = renderView({ items: [a, b] });
    const [ia, ib] = instances();
    rerender(<RankingView {...props} items={[{ ...b }, { ...a }]} />);
    expect(instances()).toEqual([ib, ia]);
  });

  it("utilise id comme clé pour conserver les cellules quand l'ordre change", () => {
    const { rerender, props } = renderView({ items: [item(1), item(2)] });
    const [i1, i2] = instances();
    rerender(<RankingView {...props} items={[item(2), item(1)]} />);
    expect(instances()).toEqual([i2, i1]);
  });

  it("conserve les cellules lors d'un changement de tri", () => {
    const { rerender, props } = renderView();
    const before = instances();
    rerender(<RankingView {...props} sortConfig={{ sort: "rating", direction: "asc" }} />);
    expect(instances()).toEqual(before);
    expect(screen.getAllByTestId("cell-grid")[0]).toHaveAttribute("data-sort", "rating");
  });
});

describe("RankingView – charger plus", () => {
  it("affiche le bouton « Charger plus » quand il reste des éléments", async () => {
    const user = userEvent.setup();
    const { props } = renderView({ hasMore: true });
    await user.click(screen.getByRole("button", { name: dict.loadMore }));
    expect(props.loadMore).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas le bouton quand il n'y a plus d'éléments", () => {
    renderView({ hasMore: false });
    expect(screen.queryByRole("button", { name: dict.loadMore })).not.toBeInTheDocument();
  });

  it("garde le bouton visible pendant un chargement : désactivé, avec le libellé de chargement", () => {
    renderView({ hasMore: true, loading: true });
    const btn = screen.getByRole("button", { name: dict.loading });
    expect(btn).toBeDisabled();
    expect(screen.queryByRole("button", { name: dict.loadMore })).not.toBeInTheDocument();
  });

  it("ne rappelle pas loadMore au clic pendant un chargement", async () => {
    const user = userEvent.setup();
    const { props } = renderView({ hasMore: true, loading: true });
    await user.click(screen.getByRole("button", { name: dict.loading }));
    expect(props.loadMore).not.toHaveBeenCalled();
  });

  it("le bouton est actif hors chargement", () => {
    renderView({ hasMore: true, loading: false });
    expect(screen.getByRole("button", { name: dict.loadMore })).toBeEnabled();
  });

  it("retrouve « Charger plus » actif quand le chargement se termine", () => {
    const { rerender, props } = renderView({ hasMore: true, loading: true });
    rerender(<RankingView {...props} loading={false} />);
    expect(screen.getByRole("button", { name: dict.loadMore })).toBeEnabled();
    expect(screen.queryByText(dict.loading)).not.toBeInTheDocument();
  });

  it("disparaît à la fin du chargement s'il n'y a plus d'éléments", () => {
    const { rerender, props } = renderView({ hasMore: true, loading: true });
    rerender(<RankingView {...props} hasMore={false} loading={false} />);
    expect(screen.queryByRole("button", { name: dict.loading })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.loadMore })).not.toBeInTheDocument();
  });

  it("n'affiche pas le bouton en chargement quand il n'y a plus d'éléments", () => {
    renderView({ hasMore: false, loading: true });
    expect(screen.queryByRole("button", { name: dict.loading })).not.toBeInTheDocument();
  });

  it("cache le bouton sans élément ni suite", () => {
    renderView({ items: [], hasMore: false });
    expect(screen.queryByRole("button", { name: dict.loadMore })).not.toBeInTheDocument();
  });
});
