import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import { FRONT_ROUTES } from "../constants/routes";
import MyPage from "./page";

const dict = languages.fr.rankingcategories;

const h = vi.hoisted(() => ({ push: vi.fn(), user: { id: 1 } as { id: number } | null }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("../components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) =>
    h.user ? <>{children}</> : <div data-testid="skeleton">{skeleton}</div>,
}));

beforeEach(() => {
  h.push.mockReset();
  h.user = { id: 1 };
});

describe("MyPage", () => {
  it("affiche les trois catégories avec le libellé de la langue", () => {
    render(<MyPage />);
    for (const label of [dict.tracks, dict.albums, dict.artists]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText(dict.viewRanking)).toHaveLength(3);
  });

  it("affiche le squelette quand l'utilisateur n'est pas connecté", () => {
    h.user = null;
    render(<MyPage />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByText(dict.tracks)).toBeNull();
  });

  it.each([
    ["tracks", "/tracks"],
    ["albums", "/albums"],
    ["artists", "/artists"],
  ] as const)("un clic sur %s ouvre le classement correspondant", async (key, path) => {
    const user = userEvent.setup();
    render(<MyPage />);
    await user.click(screen.getByText(dict[key]));
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.MY_RANKINGS}${path}`);
  });

  it("les catégories sont utilisables au clavier (focus + Entrée)", async () => {
    const user = userEvent.setup();
    render(<MyPage />);
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
    await user.keyboard("{Enter}");
    expect(h.push).toHaveBeenCalledWith(`${FRONT_ROUTES.MY_RANKINGS}/tracks`);
  });

  it("expose chaque catégorie comme un lien ou un bouton nommé", () => {
    render(<MyPage />);
    for (const label of [dict.tracks, dict.albums, dict.artists]) {
      const el = screen.getByRole("button", { name: new RegExp(label) });
      expect(el).toBeInTheDocument();
    }
  });
});
