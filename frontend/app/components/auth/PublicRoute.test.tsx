import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicRoute from "./PublicRoute";

const h = vi.hoisted(() => ({
  auth: { user: null as object | null, loading: false },
  push: vi.fn(),
}));

vi.mock("../../context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));

const makeUi = () => (
  <PublicRoute skeleton={<div data-testid="skeleton" />}>
    <div data-testid="contenu">Formulaire</div>
  </PublicRoute>
);

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { user: null, loading: false };
});

describe("PublicRoute", () => {
  it("affiche le skeleton pendant le chargement", () => {
    h.auth = { user: null, loading: true };
    render(makeUi());
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("contenu")).not.toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("n'effectue aucune redirection pendant le chargement même avec un utilisateur", () => {
    h.auth = { user: { id: 1 }, loading: true };
    render(makeUi());
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("affiche le contenu à un visiteur déconnecté, sans redirection", () => {
    render(makeUi());
    expect(screen.getByTestId("contenu")).toHaveTextContent("Formulaire");
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("ne rend rien et redirige vers /account si l'utilisateur est connecté", () => {
    h.auth = { user: { id: 1 }, loading: false };
    const { container } = render(makeUi());
    expect(container).toBeEmptyDOMElement();
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith("/account");
  });

  it("redirige quand la connexion aboutit après le chargement", () => {
    h.auth = { user: null, loading: true };
    const { rerender } = render(makeUi());
    h.auth = { user: { id: 1 }, loading: false };
    rerender(makeUi());
    expect(screen.queryByTestId("contenu")).not.toBeInTheDocument();
    expect(h.push).toHaveBeenCalledWith("/account");
  });

  it("révèle le contenu quand le chargement se termine sans utilisateur", () => {
    h.auth = { user: null, loading: true };
    const { rerender } = render(makeUi());
    h.auth = { user: null, loading: false };
    rerender(makeUi());
    expect(screen.getByTestId("contenu")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });
});
