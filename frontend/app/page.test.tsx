/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "./constants/locales/lang";
import { FRONT_ROUTES } from "./constants/routes";
import HomePage from "./page";

const dict = languages.fr.home;

const h = vi.hoisted(() => ({
  push: vi.fn(),
  user: null as any,
  getHomeData: vi.fn(),
  refreshUserData: vi.fn(),
  getTodayStats: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("./context/languageContext", async () => {
  const { languages } = await import("./constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("./context/authContext", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("./hooks/useApiAllDatas", () => ({ useApiAllDatas: () => ({ getHomeData: h.getHomeData }) }));
vi.mock("./hooks/useApiMyDatas", () => ({
  useApiMyDatas: () => ({ refreshUserData: h.refreshUserData, getTodayStats: h.getTodayStats }),
}));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const GLOBAL = { users: 1234, streams: 9876543, tracks: 4200, albums: 310, artists: 55 };
const loggedIn = () => ({ is_logged_in: true, id: 1 });

/** Valeur affichée dans la carte de stat portant ce libellé. */
const statValue = (label: string) => {
  const labelEl = screen.getByText(label);
  return labelEl.parentElement!.firstElementChild!.textContent;
};

const renderHome = async () => {
  let utils!: ReturnType<typeof render>;
  await act(async () => { utils = render(<HomePage />); });
  return utils;
};

beforeEach(() => {
  h.push.mockReset();
  h.getHomeData.mockReset();
  h.refreshUserData.mockReset();
  h.getTodayStats.mockReset();
  h.user = null;
  h.getHomeData.mockResolvedValue(GLOBAL);
  h.refreshUserData.mockResolvedValue(undefined);
  h.getTodayStats.mockResolvedValue({ nb_streams: 12, nb_minutes: 3456 });
});

describe("HomePage - visiteur déconnecté", () => {
  it("affiche le hero, les libellés de stats et la section technique", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(dict.hero1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(`${dict.hero2}.`);
    expect(screen.getByText(new RegExp(dict.herop1))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(dict.herop2))).toBeInTheDocument();
    for (const l of [dict.stats1, dict.stats2, dict.stats3, dict.stats4, dict.stats5]) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 2, name: dict.techtitre })).toBeInTheDocument();
    for (const tech of ["Next.js", "FastAPI", "SQLModel", "PostgreSQL"]) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });

  it("n'affiche ni activité du jour ni partage de résumé", async () => {
    await renderHome();
    expect(screen.queryByText(dict.titre)).toBeNull();
    expect(screen.queryByText("Streams")).toBeNull();
    expect(screen.queryByText("Minutes")).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(dict.btnShare) })).toBeNull();
  });

  it("ne charge pas les stats du jour", async () => {
    await renderHome();
    expect(h.refreshUserData).not.toHaveBeenCalled();
    expect(h.getTodayStats).not.toHaveBeenCalled();
  });

  it("traite user null et user sans is_logged_in comme déconnecté", async () => {
    h.user = { is_logged_in: false };
    await renderHome();
    expect(screen.queryByText(dict.titre)).toBeNull();
    expect(h.refreshUserData).not.toHaveBeenCalled();
  });

  it("n'a qu'un seul élément main", async () => {
    const { container } = await renderHome();
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});

describe("HomePage - stats globales", () => {
  it("affiche '...' pendant le chargement puis les valeurs formatées fr-FR", async () => {
    const d = deferred<typeof GLOBAL>();
    h.getHomeData.mockReturnValue(d.promise);
    await renderHome();
    for (const l of [dict.stats1, dict.stats2, dict.stats3, dict.stats4, dict.stats5]) {
      expect(statValue(l)).toBe("...");
    }
    await act(async () => { d.resolve(GLOBAL); });
    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
    expect(statValue(dict.stats1)).toBe(fmt(GLOBAL.streams));
    expect(statValue(dict.stats2)).toBe(fmt(GLOBAL.users));
    expect(statValue(dict.stats3)).toBe(fmt(GLOBAL.tracks));
    expect(statValue(dict.stats4)).toBe(fmt(GLOBAL.albums));
    expect(statValue(dict.stats5)).toBe(fmt(GLOBAL.artists));
  });

  it("sépare les milliers par une espace (pas de virgule)", async () => {
    await renderHome();
    const v = statValue(dict.stats1)!;
    expect(v).not.toContain(",");
    expect(v.replace(/\s/g, " ")).toBe("9 876 543");
  });

  it("arrondit les décimales (maximumFractionDigits: 0)", async () => {
    h.getHomeData.mockResolvedValue({ ...GLOBAL, users: 1234.6, streams: 0.4 });
    await renderHome();
    expect(statValue(dict.stats2).replace(/\s/g, " ")).toBe("1 235");
    expect(statValue(dict.stats1)).toBe("0");
  });

  it("affiche 0 pour des compteurs à zéro", async () => {
    h.getHomeData.mockResolvedValue({ users: 0, streams: 0, tracks: 0, albums: 0, artists: 0 });
    await renderHome();
    expect(statValue(dict.stats3)).toBe("0");
  });

  it("n'appelle getHomeData qu'une fois au montage", async () => {
    await renderHome();
    expect(h.getHomeData).toHaveBeenCalledTimes(1);
  });

  it("se redéclenche quand la référence de getHomeData change", async () => {
    const { rerender } = await renderHome();
    const next = vi.fn().mockResolvedValue({ ...GLOBAL, users: 7 });
    const original = h.getHomeData;
    h.getHomeData = next;
    await act(async () => { rerender(<HomePage />); });
    h.getHomeData = original;
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("ne replante pas et revient aux valeurs initiales (0) si l'API échoue", async () => {
    h.getHomeData.mockRejectedValue(new Error("boom"));
    await renderHome();
    expect(statValue(dict.stats1)).toBe("0");
    expect(statValue(dict.stats5)).toBe("0");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("ne reste pas bloqué sur '...' après un échec", async () => {
    h.getHomeData.mockRejectedValue(new Error("boom"));
    await renderHome();
    expect(screen.queryByText("...")).toBeNull();
  });

  it("ne plante pas si getHomeData renvoie null", async () => {
    h.getHomeData.mockResolvedValue(null);
    await expect(renderHome()).resolves.toBeDefined();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("ne plante pas si getHomeData renvoie un objet partiel", async () => {
    h.getHomeData.mockResolvedValue({ users: 5 });
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(statValue(dict.stats2)).toBe("5");
  });
});

describe("HomePage - visiteur connecté", () => {
  beforeEach(() => { h.user = loggedIn(); });

  it("affiche '...' dans les cartes Streams et Minutes avant la réponse", async () => {
    const d = deferred<{ nb_streams: number; nb_minutes: number }>();
    h.getTodayStats.mockReturnValue(d.promise);
    await renderHome();
    expect(screen.getByText(dict.titre)).toBeInTheDocument();
    expect(statValue("Streams")).toBe("...");
    expect(statValue("Minutes")).toBe("...");
    await act(async () => { d.resolve({ nb_streams: 1, nb_minutes: 2 }); });
    expect(statValue("Streams")).toBe("1");
    expect(statValue("Minutes")).toBe("2");
  });

  it("appelle refreshUserData puis getTodayStats, dans cet ordre", async () => {
    const order: string[] = [];
    h.refreshUserData.mockImplementation(async () => { order.push("refresh"); });
    h.getTodayStats.mockImplementation(async () => { order.push("today"); return { nb_streams: 1, nb_minutes: 1 }; });
    await renderHome();
    expect(order).toEqual(["refresh", "today"]);
  });

  it("n'appelle pas getTodayStats tant que refreshUserData n'a pas terminé", async () => {
    const d = deferred<void>();
    h.refreshUserData.mockReturnValue(d.promise);
    await renderHome();
    expect(h.getTodayStats).not.toHaveBeenCalled();
    await act(async () => { d.resolve(); });
    expect(h.getTodayStats).toHaveBeenCalledTimes(1);
  });

  it("affiche les stats du jour (nombres)", async () => {
    await renderHome();
    expect(statValue("Streams")).toBe((12).toLocaleString());
    expect(statValue("Minutes")).toBe((3456).toLocaleString());
  });

  it("affiche aussi les stats globales", async () => {
    await renderHome();
    expect(statValue(dict.stats2).replace(/\s/g, " ")).toBe("1 234");
  });

  it("affiche la section de partage avec ses textes", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 3, name: dict.shareTitle })).toBeInTheDocument();
    expect(screen.getByText(dict.shareSub)).toBeInTheDocument();
  });

  it("garde '...' dans les cartes du jour si refreshUserData échoue, sans planter", async () => {
    h.refreshUserData.mockRejectedValue(new Error("refresh"));
    await renderHome();
    expect(h.getTodayStats).not.toHaveBeenCalled();
    expect(statValue("Streams")).toBe("...");
    expect(statValue("Minutes")).toBe("...");
  });

  it("garde '...' si getTodayStats échoue, sans planter", async () => {
    h.getTodayStats.mockRejectedValue(new Error("today"));
    await renderHome();
    expect(statValue("Streams")).toBe("...");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("n'affiche pas '...' dans les stats globales une fois tout terminé, même après un échec des stats du jour", async () => {
    h.getTodayStats.mockRejectedValue(new Error("today"));
    await renderHome();
    expect(statValue(dict.stats1).replace(/\s/g, " ")).toBe("9 876 543");
  });

  it("ne plante pas si getTodayStats renvoie null", async () => {
    h.getTodayStats.mockResolvedValue(null);
    await expect(renderHome()).resolves.toBeDefined();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("ne plante pas si getTodayStats renvoie des champs absents", async () => {
    h.getTodayStats.mockResolvedValue({});
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("recharge les stats du jour quand l'objet user change", async () => {
    const { rerender } = await renderHome();
    expect(h.refreshUserData).toHaveBeenCalledTimes(1);
    h.user = loggedIn();
    await act(async () => { rerender(<HomePage />); });
    expect(h.refreshUserData).toHaveBeenCalledTimes(2);
    expect(h.getTodayStats).toHaveBeenCalledTimes(2);
  });

  it("ne recharge pas si le rerender garde le même objet user", async () => {
    const { rerender } = await renderHome();
    await act(async () => { rerender(<HomePage />); });
    expect(h.refreshUserData).toHaveBeenCalledTimes(1);
  });

  it("charge les stats du jour après une connexion (déconnecté -> connecté)", async () => {
    h.user = null;
    const { rerender } = await renderHome();
    expect(h.refreshUserData).not.toHaveBeenCalled();
    h.user = loggedIn();
    await act(async () => { rerender(<HomePage />); });
    expect(h.refreshUserData).toHaveBeenCalledTimes(1);
    expect(screen.getByText(dict.titre)).toBeInTheDocument();
  });

  it("masque l'activité du jour après une déconnexion", async () => {
    const { rerender } = await renderHome();
    h.user = null;
    await act(async () => { rerender(<HomePage />); });
    expect(screen.queryByText(dict.titre)).toBeNull();
  });

  it("ne relance pas getHomeData lors du changement d'utilisateur", async () => {
    const { rerender } = await renderHome();
    h.user = loggedIn();
    await act(async () => { rerender(<HomePage />); });
    expect(h.getHomeData).toHaveBeenCalledTimes(1);
  });

  it("garde les stats globales visibles pendant le chargement des stats du jour", async () => {
    const d = deferred<void>();
    h.refreshUserData.mockReturnValue(d.promise);
    await renderHome();
    // Les stats globales sont déjà chargées : elles ne devraient pas repasser à '...'
    expect(statValue(dict.stats1)).not.toBe("...");
    await act(async () => { d.resolve(); });
  });
});

describe("HomePage - navigation", () => {
  it("le bouton de partage pousse la route du résumé", async () => {
    h.user = loggedIn();
    const user = userEvent.setup();
    await renderHome();
    await user.click(screen.getByRole("button", { name: new RegExp(dict.btnShare) }));
    expect(h.push).toHaveBeenCalledTimes(1);
    expect(h.push).toHaveBeenCalledWith(FRONT_ROUTES.RESUME);
  });

  it("le bouton de partage fonctionne au clavier (Entrée et Espace)", async () => {
    h.user = loggedIn();
    const user = userEvent.setup();
    await renderHome();
    screen.getByRole("button", { name: new RegExp(dict.btnShare) }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(h.push).toHaveBeenCalledTimes(2);
    expect(h.push).toHaveBeenCalledWith(FRONT_ROUTES.RESUME);
  });

  it("le bouton principal du hero déclenche une navigation", async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.click(screen.getByRole("button", { name: dict.btn1 }));
    expect(h.push).toHaveBeenCalled();
  });

  it("le bouton 'En savoir plus' déclenche une navigation", async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.click(screen.getByRole("button", { name: new RegExp(dict.learnMore) }));
    expect(h.push).toHaveBeenCalled();
  });
});

describe("HomePage - accessibilité", () => {
  it("expose un unique h1 et des boutons nommés", async () => {
    await renderHome();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: dict.btn1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(dict.learnMore) })).toBeInTheDocument();
  });

  it("expose le landmark main", async () => {
    await renderHome();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("l'ordre de tabulation suit l'ordre visuel (hero puis section technique)", async () => {
    const user = userEvent.setup();
    await renderHome();
    await user.tab();
    expect(screen.getByRole("button", { name: dict.btn1 })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: new RegExp(dict.learnMore) })).toHaveFocus();
  });

  it("pour un connecté, le bouton de partage est le premier élément focalisable", async () => {
    h.user = loggedIn();
    const user = userEvent.setup();
    await renderHome();
    await user.tab();
    expect(screen.getByRole("button", { name: new RegExp(dict.btnShare) })).toHaveFocus();
  });

  it("chaque carte de stat associe valeur et libellé dans le même conteneur", async () => {
    await renderHome();
    const main = screen.getByRole("main");
    const card = screen.getByText(dict.stats4).parentElement!;
    expect(within(main).getByText(dict.stats4)).toBe(card.lastElementChild);
    expect(card.children).toHaveLength(2);
  });
});
