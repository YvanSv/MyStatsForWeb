import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLayout from "./page";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});


const h = vi.hoisted(() => ({
  user: { id: 1, role: "admin" } as { id: number; role: string } | null,
  adminOnlyProp: undefined as unknown,
}));

vi.mock("../components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton, adminOnly }: { children: React.ReactNode; skeleton: React.ReactNode; adminOnly?: boolean }) => {
    h.adminOnlyProp = adminOnly;
    const allowed = h.user && (!adminOnly || h.user.role === "admin");
    return allowed ? <>{children}</> : <div data-testid="skeleton">{skeleton}</div>;
  },
}));

beforeEach(() => {
  h.user = { id: 1, role: "admin" };
  h.adminOnlyProp = undefined;
});

describe("Page d'accueil admin", () => {
  it("affiche le titre et le message de bienvenue", () => {
    render(<AdminLayout />);
    expect(screen.getByRole("heading", { level: 1, name: "Administration" })).toBeInTheDocument();
    expect(screen.getByText(/Sélectionnez un module pour commencer/)).toBeInTheDocument();
  });

  it("est protégée par ProtectedRoute en mode adminOnly", () => {
    render(<AdminLayout />);
    expect(h.adminOnlyProp).toBe(true);
  });

  it("ne rend pas le contenu pour un utilisateur non connecté", () => {
    h.user = null;
    render(<AdminLayout />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Administration" })).toBeNull();
  });

  it("ne rend pas le contenu pour un utilisateur non admin", () => {
    h.user = { id: 2, role: "user" };
    render(<AdminLayout />);
    expect(screen.queryByRole("heading", { name: "Administration" })).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("affiche exactement trois modules sous forme de liens", () => {
    render(<AdminLayout />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it.each([
    ["Create Requests", "/admin/create-requests", /création de track/],
    ["Merge Requests", "/admin/merge-requests", /demandes de fusion/],
    ["Conflits", "/admin/conflits", /doublons et les incohérences/],
  ])("le module %s pointe vers %s et affiche sa description", (title, href, desc) => {
    render(<AdminLayout />);
    const link = screen.getByRole("link", { name: new RegExp(title, "i") });
    expect(link).toHaveAttribute("href", href);
    expect(within(link).getByRole("heading", { level: 2 })).toHaveTextContent(title);
    expect(within(link).getByText(desc)).toBeInTheDocument();
    expect(within(link).getByText(/Accéder au module/)).toBeInTheDocument();
  });

  it("garde l'ordre des modules", () => {
    render(<AdminLayout />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/admin/create-requests", "/admin/merge-requests", "/admin/conflits"]);
  });

  it("les liens sont atteignables au clavier dans l'ordre", async () => {
    const user = userEvent.setup();
    render(<AdminLayout />);
    const links = screen.getAllByRole("link");
    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.tab();
    expect(links[1]).toHaveFocus();
    await user.tab();
    expect(links[2]).toHaveFocus();
  });
});

const FRENCH = /[àâçéèêëîïôùûœÉ]|Chargement|Aucun|Erreur|Retour|Historique|Rejeter|Approuver|Annuler|Confirmer|Sauvegard|Brider|Dépasse|Requête|Validation|Arbitrage|Raison|Créée|introuvable|demande|écoute|suggér|fusion|modification|Priorité|Accéder|Bienvenue|Gérer|Résoudre|Impact de/;

describe("Page d'accueil admin (anglais)", () => {
beforeEach(() => { lang.current = "en"; });
afterEach(() => { lang.current = "fr"; });

  it("n'affiche aucun texte français", () => {
    render(<AdminLayout />);
    expect(screen.getByRole("heading", { level: 1, name: "Administration" })).toBeInTheDocument();
    expect(screen.getByText(/Select a module to get started/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Conflicts/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Open module/)).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(FRENCH);
  });
});
