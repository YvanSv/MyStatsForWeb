import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TrackDetail from "./tracks/[id]/page";
import AlbumDetail from "./albums/[id]/page";
import ArtistDetail from "./artists/[id]/page";

const h = vi.hoisted(() => ({ user: true }));

vi.mock("@/app/components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) => <>{h.user ? children : skeleton}</>,
}));
vi.mock("./detail/ItemDetailPage", () => ({ default: ({ type }: { type: string }) => <div data-testid="detail" data-type={type} /> }));
vi.mock("./detail/ItemDetailSkeleton", () => ({ default: () => <div data-testid="skeleton" /> }));

beforeEach(() => { h.user = true; });

describe.each([
  ["tracks", TrackDetail, "track"],
  ["albums", AlbumDetail, "album"],
  ["artists", ArtistDetail, "artist"],
] as const)("page /my/%s/[id]", (_name, Page, type) => {
  it("branche la page de détail partagée avec le bon type", () => {
    render(<Page />);
    expect(screen.getByTestId("detail")).toHaveAttribute("data-type", type);
  });

  it("affiche le squelette sans utilisateur connecté", () => {
    h.user = false;
    render(<Page />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("detail")).toBeNull();
  });
});
