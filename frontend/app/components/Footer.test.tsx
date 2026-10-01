import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { languages } from "../constants/locales/lang";
import { FRONT_ROUTES } from "../constants/routes";
import Footer from "./Footer";

const dict = languages.fr.footer;

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
// Le badge a son propre test (appels réseau) : simple stub ici
vi.mock("./small_elements/StatusBadge", () => ({
  ApiStatusBadge: () => <div data-testid="api-status" />,
}));

afterEach(() => {
  vi.useRealTimers();
});

describe("Footer", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("affiche la marque deux fois (version PC et version mobile)", () => {
    render(<Footer />);
    expect(screen.getAllByRole("heading", { name: "MyStats" })).toHaveLength(2);
    expect(screen.getAllByText("Analytics Studio")).toHaveLength(2);
  });

  it("affiche la version lue dans NEXT_PUBLIC_APP_VERSION, et rien sans version", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "1.2.3");
    const { unmount } = render(<Footer />);
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
    unmount();
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "");
    render(<Footer />);
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("contient une balise footer", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("propose les liens vers le dashboard et la page à propos", () => {
    render(<Footer />);
    const nav = within(screen.getByRole("navigation"));
    expect(nav.getByRole("link", { name: dict.dashboard })).toHaveAttribute("href", FRONT_ROUTES.DASHBOARD);
    expect(nav.getByRole("link", { name: dict.about })).toHaveAttribute("href", FRONT_ROUTES.ABOUT);
    expect(nav.getAllByRole("link")).toHaveLength(2);
  });

  it("affiche le copyright avec l'année courante", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} • MyStats • ${dict.rights}`)).toBeInTheDocument();
  });

  it("utilise l'année système au moment du rendu", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-06-15T12:00:00Z"));
    render(<Footer />);
    expect(screen.getByText(/© 2031 •/)).toBeInTheDocument();
  });

  it("affiche le badge de statut de l'API, la baseline et la version", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.12.2");
    render(<Footer />);
    expect(screen.getByTestId("api-status")).toBeInTheDocument();
    expect(screen.getByText(dict.tagline)).toBeInTheDocument();
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });
});
