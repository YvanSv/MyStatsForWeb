import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";

const h = vi.hoisted(() => ({
  auth: { user: null as { isAdmin?: boolean } | null, loading: false },
  push: vi.fn(),
  pathname: "/account",
}));

vi.mock("../../context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => h.pathname,
}));

const renderRoute = (props: { adminOnly?: boolean } = {}) =>
  render(
    <ProtectedRoute skeleton={<div data-testid="skeleton" />} {...props}>
      <div data-testid="contenu">Contenu privé</div>
    </ProtectedRoute>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { user: null, loading: false };
  h.pathname = "/account";
});

describe("ProtectedRoute – chargement", () => {
  it("affiche le skeleton, sans contenu ni redirection", () => {
    h.auth = { user: null, loading: true };
    renderRoute();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("contenu")).not.toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("affiche le skeleton même si un utilisateur est déjà connu", () => {
    h.auth = { user: { isAdmin: false }, loading: true };
    renderRoute();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("contenu")).not.toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("ne redirige pas un admin requis tant que le chargement dure", () => {
    h.auth = { user: { isAdmin: false }, loading: true };
    renderRoute({ adminOnly: true });
    expect(h.push).not.toHaveBeenCalled();
  });
});

describe("ProtectedRoute – utilisateur non connecté", () => {
  it("ne rend rien (ni contenu ni skeleton)", () => {
    const { container } = renderRoute();
    expect(container).toBeEmptyDOMElement();
  });

  it("redirige vers /auth en conservant la page demandée", () => {
    renderRoute();
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Faccount");
  });

  it("encode le chemin de redirection", () => {
    h.pathname = "/all/tracks";
    renderRoute();
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Fall%2Ftracks");
  });

  it("conserve la query string d'origine (filtres, tri) dans le retour", () => {
    h.pathname = "/my/tracks";
    window.history.pushState({}, "", "/my/tracks?sort=rating&direction=asc&artist=Daft%20Punk");
    renderRoute();
    expect(h.push).toHaveBeenCalledWith(
      `/auth?redirect=${encodeURIComponent("/my/tracks?sort=rating&direction=asc&artist=Daft%20Punk")}`,
    );
    window.history.pushState({}, "", "/");
  });

  it("redirige aussi en mode adminOnly", () => {
    renderRoute({ adminOnly: true });
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Faccount");
  });
});

describe("ProtectedRoute – utilisateur connecté", () => {
  it("affiche le contenu sans redirection", () => {
    h.auth = { user: { isAdmin: false }, loading: false };
    renderRoute();
    expect(screen.getByTestId("contenu")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("affiche le contenu d'un admin lorsque adminOnly est demandé", () => {
    h.auth = { user: { isAdmin: true }, loading: false };
    renderRoute({ adminOnly: true });
    expect(screen.getByTestId("contenu")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it.each([
    ["isAdmin à false", { isAdmin: false }],
    ["isAdmin absent", {}],
  ])("adminOnly : masque le contenu et redirige vers l'accueil (%s)", (_nom, user) => {
    h.auth = { user, loading: false };
    const { container } = renderRoute({ adminOnly: true });
    expect(container).toBeEmptyDOMElement();
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("n'exige pas d'être admin sans adminOnly", () => {
    h.auth = { user: {}, loading: false };
    renderRoute();
    expect(screen.getByTestId("contenu")).toBeInTheDocument();
  });
});

describe("ProtectedRoute – transitions", () => {
  it("passe du skeleton au contenu puis redirige si la session s'avère absente", () => {
    h.auth = { user: null, loading: true };
    const { rerender } = renderRoute();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();

    h.auth = { user: { isAdmin: false }, loading: false };
    rerender(
      <ProtectedRoute skeleton={<div data-testid="skeleton" />}>
        <div data-testid="contenu" />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId("contenu")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("redirige une fois le chargement terminé sans utilisateur", () => {
    h.auth = { user: null, loading: true };
    const { rerender } = renderRoute();
    h.auth = { user: null, loading: false };
    rerender(
      <ProtectedRoute skeleton={<div data-testid="skeleton" />}>
        <div data-testid="contenu" />
      </ProtectedRoute>,
    );
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Faccount");
  });
});
