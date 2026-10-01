import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FRONT_ROUTES } from "@/app/constants/routes";
import DashboardPage from "./page";

const h = vi.hoisted(() => ({
  push: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: {} as Record<string, any>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("@/app/context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/app/components/small_elements/CustomSpinner", () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}));

beforeEach(() => {
  h.push.mockReset();
  h.auth = { isLoggedIn: true, user: { id: 7, slug: "yvan" }, loading: false };
});

describe("DashboardPage (redirection)", () => {
  it("affiche un spinner de chargement", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redirige vers le dashboard du slug quand l'utilisateur en a un", () => {
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.DASHBOARD}/yvan`);
  });

  it("utilise l'id quand le slug est vide", () => {
    h.auth.user = { id: 7, slug: "" };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.DASHBOARD}/7`);
  });

  it("utilise l'id quand le slug est absent", () => {
    h.auth.user = { id: 7 };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.DASHBOARD}/7`);
  });

  it("utilise l'id quand le slug est null", () => {
    h.auth.user = { id: 7, slug: null };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.DASHBOARD}/7`);
  });

  it("n'effectue aucune redirection tant que l'authentification charge", () => {
    h.auth = { isLoggedIn: false, user: null, loading: true };
    render(<DashboardPage />);
    expect(h.push).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redirige vers /auth quand l'utilisateur n'est pas connecté", () => {
    h.auth = { isLoggedIn: false, user: null, loading: false };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth");
  });

  it("redirige vers /auth quand connecté sans utilisateur", () => {
    h.auth = { isLoggedIn: true, user: null, loading: false };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth");
  });

  it("redirige vers /auth quand l'utilisateur n'a pas d'id", () => {
    h.auth = { isLoggedIn: true, user: { slug: "yvan" }, loading: false };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth");
  });

  it("redirige vers /auth quand l'id vaut 0", () => {
    h.auth = { isLoggedIn: true, user: { id: 0, slug: "" }, loading: false };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth");
  });

  it("redirige vers /auth quand l'id existe mais que l'utilisateur est déconnecté", () => {
    h.auth = { isLoggedIn: false, user: { id: 7, slug: "yvan" }, loading: false };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth");
  });

  it("redirige une fois le chargement terminé", () => {
    h.auth = { isLoggedIn: false, user: null, loading: true };
    const { rerender } = render(<DashboardPage />);
    expect(h.push).not.toHaveBeenCalled();
    h.auth = { isLoggedIn: true, user: { id: 3, slug: "" }, loading: false };
    rerender(<DashboardPage />);
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.DASHBOARD}/3`);
  });
});
