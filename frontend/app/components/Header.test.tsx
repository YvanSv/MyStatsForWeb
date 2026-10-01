import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import { FRONT_ROUTES } from "../constants/routes";
import Header from "./Header";

const dict = languages.fr.header;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: {} as Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spotify: {} as Record<string, any>,
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  // Lien simulé : on garde href et onClick, mais on neutralise la navigation native de jsdom
  default: ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void } & Record<string, unknown>) => (
    <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(); }} {...rest}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  // `priority` est une prop next/image qui n'existe pas sur <img>
  default: ({ priority, alt, ...props }: { priority?: boolean; alt?: string } & Record<string, unknown>) => {
    void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} {...props} />;
  },
}));
vi.mock("../context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("../context/currentlyPlayingContext", () => ({ useSpotify: () => h.spotify }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("./small_elements/SpotifyLiveCard", () => ({
  default: (props: { isListening: boolean; data: { title?: string }; currentProgress: number; size: string }) => (
    <div data-testid="live-card" data-listening={String(props.isListening)} data-progress={props.currentProgress} data-size={props.size}>
      {props.data?.title}
    </div>
  ),
}));

// --- Helpers ---------------------------------------------------------------

const makeUser = (overrides = {}) => ({ id: 1, user_name: "Yvan", avatar: "https://img/avatar.png", ...overrides });
const pcNav = () => screen.getAllByRole("navigation")[0];
const burger = (container: HTMLElement) => container.querySelector("button.md\\:hidden") as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { isLoggedIn: true, user: makeUser(), logout: vi.fn() };
  h.spotify = { listening: { is_listening: false, data: null }, localProgress: 0 };
});

// --- Tests -----------------------------------------------------------------

describe("Header – logo", () => {
  it("affiche le logo et le nom de l'application", () => {
    render(<Header />);
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "/logo.png");
    expect(screen.getByText("MyStats")).toBeInTheDocument();
  });

  it("redirige vers l'accueil au clic sur le logo", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByText("MyStats"));
    expect(h.push).toHaveBeenCalledWith("/");
  });
});

describe("Header – navigation principale", () => {
  it("affiche les quatre entrées de navigation", () => {
    render(<Header />);
    const nav = within(pcNav());
    for (const label of [dict.rankings, dict.dashboard, dict.publicProfile, dict.help]) {
      expect(nav.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it.each([
    [dict.rankings, FRONT_ROUTES.MY_RANKINGS],
    [dict.dashboard, FRONT_ROUTES.DASHBOARD],
    [dict.publicProfile, FRONT_ROUTES.PROFILE],
    [dict.help, FRONT_ROUTES.HELP],
  ])("l'entrée principale « %s » est un vrai lien vers %s", (label, path) => {
    render(<Header />);
    // Le premier lien portant ce nom est l'entrée principale (avant son sous-menu)
    expect(within(pcNav()).getAllByRole("link", { name: label })[0]).toHaveAttribute("href", path);
  });

  it("n'utilise plus router.push pour les entrées de navigation (liens natifs)", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(within(pcNav()).getAllByRole("link", { name: dict.dashboard })[0]);
    expect(h.push).not.toHaveBeenCalled();
  });

  it("propose le sous-menu des classements (titres, albums, artistes) sous forme de liens", () => {
    render(<Header />);
    const nav = within(pcNav());
    expect(nav.getByRole("link", { name: dict.tracks })).toHaveAttribute("href", "/my/tracks");
    expect(nav.getByRole("link", { name: dict.albums })).toHaveAttribute("href", "/my/albums");
    expect(nav.getByRole("link", { name: dict.artists })).toHaveAttribute("href", "/my/artists");
  });

  it("ne génère jamais de double slash dans les chemins du sous-menu des classements", () => {
    render(<Header />);
    const nav = within(pcNav());
    for (const name of [dict.tracks, dict.albums, dict.artists]) {
      expect(nav.getByRole("link", { name }).getAttribute("href")).not.toContain("//");
    }
  });

  it("propose le sous-menu du profil public (profil, import, compte) sous forme de liens", () => {
    render(<Header />);
    const nav = within(pcNav());
    // [0] = lien principal, [1] = entrée du sous-menu
    expect(nav.getAllByRole("link", { name: dict.publicProfile })[1]).toHaveAttribute("href", FRONT_ROUTES.PROFILE);
    expect(nav.getByRole("link", { name: dict.import })).toHaveAttribute("href", FRONT_ROUTES.IMPORT);
    expect(nav.getByRole("link", { name: dict.myAccount })).toHaveAttribute("href", FRONT_ROUTES.ACCOUNT);
  });

  it("le dashboard et l'aide n'ont pas de sous-menu", () => {
    render(<Header />);
    const nav = within(pcNav());
    expect(nav.getAllByRole("link", { name: dict.dashboard })).toHaveLength(1);
    expect(nav.getAllByRole("link", { name: dict.help })).toHaveLength(1);
  });
});

describe("Header – utilisateur déconnecté", () => {
  beforeEach(() => {
    h.auth = { isLoggedIn: false, user: null, logout: vi.fn() };
  });

  it("affiche le bouton de connexion et pas le menu utilisateur", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: dict.login })).toBeInTheDocument();
    expect(screen.queryByAltText("Avatar Preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.logout })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.settings })).not.toBeInTheDocument();
  });

  it("redirige vers la page d'authentification au clic sur « Se connecter »", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole("button", { name: dict.login }));
    expect(h.push).toHaveBeenCalledWith(FRONT_ROUTES.AUTH);
  });

  it("n'affiche pas la pastille Spotify, même si des données d'écoute existent", () => {
    h.spotify.listening = { is_listening: true, data: { cover_url: "c.png", title: "Song" } };
    render(<Header />);
    expect(screen.queryByText(dict.live)).not.toBeInTheDocument();
    expect(screen.queryByTestId("live-card")).not.toBeInTheDocument();
  });
});

describe("Header – utilisateur connecté", () => {
  it("affiche l'avatar et le nom de l'utilisateur", () => {
    render(<Header />);
    expect(screen.getByAltText("Avatar Preview")).toHaveAttribute("src", "https://img/avatar.png");
    expect(screen.getByText("Yvan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.login })).not.toBeInTheDocument();
  });

  it("utilise « Username » quand le nom d'utilisateur est vide ou absent", () => {
    h.auth.user = makeUser({ user_name: "" });
    render(<Header />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("utilise « Username » quand l'utilisateur n'est pas encore chargé", () => {
    h.auth.user = null;
    render(<Header />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("redirige vers le compte au clic sur le bouton profil", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByAltText("Avatar Preview"));
    expect(h.push).toHaveBeenCalledWith(FRONT_ROUTES.ACCOUNT);
  });

  it.each([
    [dict.settings, FRONT_ROUTES.SETTINGS],
    [dict.import, FRONT_ROUTES.IMPORT],
    [dict.myAccount, FRONT_ROUTES.ACCOUNT],
  ])("le menu utilisateur contient le lien « %s » vers %s", (label, path) => {
    render(<Header />);
    const links = screen.getAllByRole("link", { name: label });
    expect(links[links.length - 1]).toHaveAttribute("href", path);
  });

  it("le menu utilisateur donne accès au profil public, au dashboard et à l'aide", () => {
    render(<Header />);
    // Dernier bouton portant le nom = entrée du menu déroulant utilisateur
    for (const [label, path] of [
      [dict.publicProfile, FRONT_ROUTES.PROFILE],
      [dict.dashboard, FRONT_ROUTES.DASHBOARD],
      [dict.help, FRONT_ROUTES.HELP],
    ]) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links[links.length - 1]).toHaveAttribute("href", path);
    }
  });

  it("appelle logout sans naviguer au clic sur « Déconnexion »", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole("button", { name: dict.logout }));
    expect(h.auth.logout).toHaveBeenCalledTimes(1);
    expect(h.push).not.toHaveBeenCalled();
  });
});

describe("Header – écoute Spotify en direct", () => {
  it("n'affiche pas la pastille quand aucune donnée d'écoute n'est disponible", () => {
    render(<Header />);
    expect(screen.queryByText(dict.live)).not.toBeInTheDocument();
    expect(screen.queryByTestId("live-card")).not.toBeInTheDocument();
  });

  it("affiche la pochette, le badge « Direct » et la carte d'écoute quand des données existent", () => {
    h.spotify.listening = { is_listening: true, data: { cover_url: "https://img/cover.png", title: "Song" } };
    h.spotify.localProgress = 4200;
    const { container } = render(<Header />);
    expect(screen.getByText(dict.live)).toBeInTheDocument();
    expect(container.querySelector('img[src="https://img/cover.png"]')).toBeInTheDocument();
    const card = screen.getByTestId("live-card");
    expect(card).toHaveTextContent("Song");
    expect(card).toHaveAttribute("data-listening", "true");
    expect(card).toHaveAttribute("data-progress", "4200");
    expect(card).toHaveAttribute("data-size", "xs");
  });

  it("décrit la pochette avec le titre du morceau (texte alternatif)", () => {
    h.spotify.listening = { is_listening: true, data: { cover_url: "https://img/cover.png", title: "Song" } };
    render(<Header />);
    expect(screen.getByAltText("Song")).toHaveAttribute("src", "https://img/cover.png");
  });

  it("transmet l'état « en pause » à la carte quand is_listening est faux", () => {
    h.spotify.listening = { is_listening: false, data: { cover_url: "c.png", title: "Paused" } };
    render(<Header />);
    expect(screen.getByTestId("live-card")).toHaveAttribute("data-listening", "false");
  });
});

describe("Header – images absentes (pas de <img> sans src)", () => {
  it("affiche l'initiale du pseudo quand l'utilisateur n'a pas d'avatar", () => {
    h.auth.user = makeUser({ avatar: undefined });
    const { container } = render(<Header />);
    expect(screen.queryByAltText("Avatar Preview")).not.toBeInTheDocument();
    expect(container.querySelector("img:not([src])")).toBeNull();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });

  it("affiche l'initiale « U » (pseudo par défaut) sans avatar ni utilisateur chargé", () => {
    h.auth.user = null;
    render(<Header />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("affiche un repli à la place de la pochette quand cover_url est absent", () => {
    h.spotify.listening = { is_listening: true, data: { title: "Song" } };
    const { container } = render(<Header />);
    expect(screen.queryByAltText("Song")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Song" })).toBeInTheDocument();
    expect(container.querySelector("img:not([src])")).toBeNull();
    expect(screen.getByText(dict.live)).toBeInTheDocument();
  });

  it("n'affiche aucune balise <img> sans src, même sans avatar ni pochette", () => {
    h.auth.user = makeUser({ avatar: "" });
    h.spotify.listening = { is_listening: true, data: { cover_url: "", title: "Song" } };
    const { container } = render(<Header />);
    for (const img of Array.from(container.querySelectorAll("img"))) expect(img).toHaveAttribute("src");
  });
});

describe("Header – menu mobile", () => {
  it("est fermé par défaut", () => {
    render(<Header />);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("donne un nom accessible au bouton burger", () => {
    const { container } = render(<Header />);
    const button = screen.getByRole("button", { name: dict.menu });
    expect(button).toBe(burger(container));
  });

  it("indique l'état ouvert/fermé du burger avec aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const button = screen.getByRole("button", { name: dict.menu });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("s'ouvre au clic sur le burger avec les quatre entrées principales", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    const navs = screen.getAllByRole("navigation");
    expect(navs).toHaveLength(2);
    const mobile = within(navs[1]);
    for (const label of [dict.rankings, dict.dashboard, dict.publicProfile, dict.help]) {
      expect(mobile.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("propose le compte et la déconnexion dans le menu mobile quand l'utilisateur est connecté", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    const mobile = within(screen.getAllByRole("navigation")[1]);
    expect(mobile.getByRole("link", { name: dict.myAccount })).toHaveAttribute("href", FRONT_ROUTES.ACCOUNT);
    expect(mobile.getByRole("button", { name: dict.logout })).toBeInTheDocument();
    expect(mobile.queryByRole("link", { name: dict.login })).not.toBeInTheDocument();
  });

  it("se déconnecte puis ferme le menu mobile au clic sur « Déconnexion »", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    await user.click(within(screen.getAllByRole("navigation")[1]).getByRole("button", { name: dict.logout }));
    expect(h.auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("ferme le menu mobile après un clic sur « Mon compte »", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    await user.click(within(screen.getAllByRole("navigation")[1]).getByRole("link", { name: dict.myAccount }));
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("propose un lien de connexion (sans compte ni déconnexion) dans le menu mobile quand l'utilisateur est déconnecté", async () => {
    const user = userEvent.setup();
    h.auth = { isLoggedIn: false, user: null, logout: vi.fn() };
    const { container } = render(<Header />);
    await user.click(burger(container));
    const mobile = within(screen.getAllByRole("navigation")[1]);
    const login = mobile.getByRole("link", { name: dict.login });
    expect(login).toHaveAttribute("href", FRONT_ROUTES.AUTH);
    expect(mobile.queryByRole("link", { name: dict.myAccount })).not.toBeInTheDocument();
    expect(mobile.queryByRole("button", { name: dict.logout })).not.toBeInTheDocument();
    await user.click(login);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("se referme au second clic sur le burger", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    await user.click(burger(container));
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("navigue puis se referme au clic sur une entrée", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    const link = within(screen.getAllByRole("navigation")[1]).getByRole("link", { name: dict.dashboard });
    expect(link).toHaveAttribute("href", FRONT_ROUTES.DASHBOARD);
    await user.click(link);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("se referme aussi lors d'une navigation via le logo", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    await user.click(burger(container));
    await user.click(screen.getByText("MyStats"));
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("animation du burger : les barres changent de classe selon l'état", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    const bars = () => Array.from(burger(container).querySelectorAll(".space-y-1\\.5 > div"));
    expect(bars()[1]).not.toHaveClass("opacity-0");
    await user.click(burger(container));
    expect(bars()[0]).toHaveClass("rotate-45");
    expect(bars()[1]).toHaveClass("opacity-0");
    expect(bars()[2]).toHaveClass("-rotate-45");
  });
});
