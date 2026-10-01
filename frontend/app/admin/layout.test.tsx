import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import AdminLayout from "./layout";

const h = vi.hoisted(() => ({
  user: { id: 1, isAdmin: true } as { id: number; isAdmin?: boolean } | null,
  loading: false,
  push: vi.fn(),
  childMounted: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }), usePathname: () => "/admin/conflits" }));
vi.mock("../context/authContext", () => ({ useAuth: () => ({ user: h.user, loading: h.loading }) }));

// Page enfant qui déclenche un « appel API » à son montage, comme les vraies pages admin
function Child() {
  useEffect(() => { h.childMounted(); }, []);
  return <div data-testid="child">contenu admin</div>;
}

beforeEach(() => {
  h.user = { id: 1, isAdmin: true };
  h.loading = false;
  h.push.mockReset();
  h.childMounted.mockReset();
});

describe("AdminLayout", () => {
  it("affiche la page enfant à un administrateur", () => {
    render(<AdminLayout><Child /></AdminLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();
  });

  it("n'affiche pas la page à un utilisateur non admin, ne la monte pas et le renvoie à l'accueil", () => {
    h.user = { id: 2, isAdmin: false };
    render(<AdminLayout><Child /></AdminLayout>);
    expect(screen.queryByTestId("child")).toBeNull();
    expect(h.childMounted).not.toHaveBeenCalled();
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("traite un utilisateur sans propriété isAdmin comme non admin", () => {
    h.user = { id: 3 };
    render(<AdminLayout><Child /></AdminLayout>);
    expect(screen.queryByTestId("child")).toBeNull();
    expect(h.childMounted).not.toHaveBeenCalled();
  });

  it("renvoie un visiteur déconnecté vers la connexion, avec la page demandée en paramètre", () => {
    h.user = null;
    render(<AdminLayout><Child /></AdminLayout>);
    expect(screen.queryByTestId("child")).toBeNull();
    expect(h.childMounted).not.toHaveBeenCalled();
    expect(h.push).toHaveBeenCalledWith("/auth?redirect=%2Fadmin%2Fconflits");
  });

  it("affiche un indicateur de chargement, sans page ni redirection, tant que l'authentification se charge", () => {
    h.user = null;
    h.loading = true;
    const { container } = render(<AdminLayout><Child /></AdminLayout>);
    expect(screen.queryByTestId("child")).toBeNull();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(h.push).not.toHaveBeenCalled();
    expect(h.childMounted).not.toHaveBeenCalled();
  });
});
