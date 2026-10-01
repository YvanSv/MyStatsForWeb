import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { FRONT_ROUTES } from "../constants/routes";
import DashboardPage from "./page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const h = vi.hoisted(() => ({ push: vi.fn(), auth: {} as Record<string, any> }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("@/app/context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("./[id]/Skeleton", () => ({ ProfileSkeleton: () => <div data-testid="skeleton" /> }));

beforeEach(() => {
  h.push.mockReset();
  h.auth = { isLoggedIn: true, loading: false, user: { id: 7, slug: "yvan" } };
});

describe("profile/page (redirection vers son profil)", () => {
  it("affiche le squelette pendant la redirection", () => {
    const { getByTestId } = render(<DashboardPage />);
    expect(getByTestId("skeleton")).toBeInTheDocument();
  });

  it("redirige vers le profil par slug quand il existe", () => {
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.PROFILE}/yvan`);
  });

  it.each([
    ["vide", ""],
    ["absent", undefined],
    ["null", null],
  ])("utilise l'id quand le slug est %s", (_n, slug) => {
    h.auth.user = { id: 7, slug };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.PROFILE}/7`);
  });

  it("ne redirige pas tant que l'authentification charge", () => {
    h.auth = { isLoggedIn: false, loading: true, user: null };
    render(<DashboardPage />);
    expect(h.push).not.toHaveBeenCalled();
  });

  it("redirige vers /auth si l'utilisateur n'est pas connecté", () => {
    h.auth = { isLoggedIn: false, loading: false, user: null };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Fprofile");
  });

  it("redirige vers /auth si connecté mais sans utilisateur", () => {
    h.auth = { isLoggedIn: true, loading: false, user: null };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Fprofile");
  });

  it("redirige vers /auth si l'utilisateur n'a pas d'id", () => {
    h.auth = { isLoggedIn: true, loading: false, user: { slug: "x" } };
    render(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Fprofile");
  });

  it("redirige une fois le chargement terminé", () => {
    h.auth = { isLoggedIn: false, loading: true, user: null };
    const { rerender } = render(<DashboardPage />);
    expect(h.push).not.toHaveBeenCalled();
    h.auth = { isLoggedIn: true, loading: false, user: { id: 3, slug: "" } };
    rerender(<DashboardPage />);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.PROFILE}/3`);
  });
});
