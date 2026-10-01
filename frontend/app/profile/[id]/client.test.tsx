/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../../constants/locales/lang";
import { FRONT_ROUTES } from "../../constants/routes";
import { ApiError } from "../../services/api";
import ProfilePage from "./client";

const dict = languages.fr.profilePage;
const t = languages.fr;
const fmt = (n: number) => n.toLocaleString(t.common.locale).replace(/\s/g, " ");

const h = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  getProfile: vi.fn(),
  getTops: vi.fn(),
  auth: {} as Record<string, any>,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, back: h.back }) }));
vi.mock("@/app/context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("@/app/hooks/useProfile", () => ({
  useProfile: () => ({ getProfile: h.getProfile, getTopDataProfile: h.getTops }),
}));
vi.mock("react-hot-toast", () => ({ default: h.toast }));

const track = (i: number) => ({
  id: i, title: `Titre ${i}`, artist: `Artiste ${i}`, image_url: `t${i}.jpg`, played_at: "2024-03-05T10:00:00Z",
});
const top = (name: string) => ({ name, image_url: `${name}.jpg`, rating: 1, count: 1, minutes: 1, engagement: 1, artist_name: "x" });

const makeProfile = (o: any = {}) => ({
  display_name: "Yvan", avatar: "av.jpg", bio: "Ma bio", slug: "yvan", banner: "ban.jpg",
  total_minutes: 3000, total_streams: 1500, peak_hour: 18,
  top_50_tracks: [top("TrackA")], top_50_albums: [top("AlbumA")], top_50_artists: [top("ArtistA")],
  recent_tracks: [track(1), track(2)],
  perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true },
  ...o,
});
const makeTops = () => ({
  top_track: { name: "BestTrack", img_url: "bt.jpg", rating: 90, isTrack: true, artist_name: "Art", album_name: "Alb" },
  top_artist: { name: "BestArtist", img_url: "ba.jpg", rating: 80, isTrack: false, artist_name: "", album_name: "" },
});

const renderPage = async (id = "yvan") => {
  const r = render(<ProfilePage id={id} />);
  await act(async () => {});
  return r;
};

beforeEach(() => {
  h.push.mockReset();
  h.back.mockReset();
  h.getProfile.mockReset();
  h.getTops.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.auth = { user: { id: 1, slug: "yvan" } };
  h.getProfile.mockResolvedValue(makeProfile());
  h.getTops.mockResolvedValue(makeTops());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ProfilePage - chargement", () => {
  it("affiche le squelette puis le profil", async () => {
    let resolve!: (v: any) => void;
    h.getProfile.mockReturnValue(new Promise((r) => (resolve = r)));
    const { container } = render(<ProfilePage id="yvan" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    await act(async () => resolve(makeProfile()));
    expect(screen.getByRole("heading", { level: 1, name: "Yvan" })).toBeInTheDocument();
  });

  it("appelle getProfile et getTopDataProfile avec l'id", async () => {
    await renderPage("abc");
    expect(h.getProfile).toHaveBeenCalledWith("abc");
    expect(h.getTops).toHaveBeenCalledWith("abc");
  });

  it.each([[""], ["undefined"]])("ne charge rien pour l'id %j et reste sur le squelette", async (id) => {
    const { container } = await renderPage(id);
    expect(h.getProfile).not.toHaveBeenCalled();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("recharge quand l'id change", async () => {
    const { rerender } = await renderPage("a");
    h.getProfile.mockResolvedValue(makeProfile({ display_name: "Autre" }));
    rerender(<ProfilePage id="b" />);
    await act(async () => {});
    expect(h.getProfile).toHaveBeenLastCalledWith("b");
    expect(screen.getByRole("heading", { level: 1, name: "Autre" })).toBeInTheDocument();
  });
});

describe("ProfilePage - erreurs", () => {
  it("affiche l'état d'erreur 404 avec le titre introuvable", async () => {
    h.getProfile.mockRejectedValue(new ApiError(404, "nope"));
    await renderPage();
    expect(screen.getByText(dict.notFound)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(h.getTops).not.toHaveBeenCalled();
  });

  it("affiche un message d'erreur pour une erreur serveur (500) au lieu d'un squelette infini", async () => {
    h.getProfile.mockRejectedValue(new ApiError(500, "boom"));
    const { container } = await renderPage();
    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("affiche une erreur pour une exception réseau inconnue au lieu d'un squelette infini", async () => {
    h.getProfile.mockRejectedValue(new TypeError("Failed to fetch"));
    const { container } = await renderPage();
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("n'écrase pas le profil si le chargement des tops échoue", async () => {
    h.getTops.mockRejectedValue(new Error("tops"));
    const { container } = await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Yvan" })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
    // plus de spinner infini : les cartes top affichent « — »
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
    expect(screen.getAllByTestId("top-stat-empty")).toHaveLength(2);
    expect(screen.getByText(dict.statTime)).toBeInTheDocument();
    expect(screen.getByText("Titre 1")).toBeInTheDocument();
  });

  it("affiche un spinner dans les cartes top tant que les tops se chargent", async () => {
    h.getTops.mockReturnValue(new Promise(() => {}));
    const { container } = await renderPage();
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(2);
    expect(screen.queryByTestId("top-stat-empty")).toBeNull();
  });

  it("réinitialise le top de l'ancien profil quand l'id change", async () => {
    const { rerender, container } = await renderPage("a");
    expect(screen.getByText("BestTrack")).toBeInTheDocument();
    h.getProfile.mockResolvedValue(makeProfile({ display_name: "Autre" }));
    h.getTops.mockReturnValue(new Promise(() => {}));
    rerender(<ProfilePage id="b" />);
    await act(async () => {});
    expect(screen.queryByText("BestTrack")).toBeNull();
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(2);
  });

  it("n'affiche pas le top de l'ancien profil si les tops du nouveau échouent", async () => {
    const { rerender } = await renderPage("a");
    h.getTops.mockRejectedValue(new Error("tops"));
    rerender(<ProfilePage id="b" />);
    await act(async () => {});
    expect(screen.queryByText("BestTrack")).toBeNull();
    expect(screen.getAllByTestId("top-stat-empty")).toHaveLength(2);
  });

  it("ignore la réponse périmée d'un ancien profil quand l'id change", async () => {
    let resolveA!: (v: any) => void;
    h.getProfile.mockImplementationOnce(() => new Promise((r) => (resolveA = r)));
    const { rerender } = render(<ProfilePage id="a" />);
    h.getProfile.mockResolvedValueOnce(makeProfile({ display_name: "Profil B" }));
    rerender(<ProfilePage id="b" />);
    await act(async () => {});
    await act(async () => resolveA(makeProfile({ display_name: "Profil A" })));
    expect(screen.getByRole("heading", { level: 1, name: "Profil B" })).toBeInTheDocument();
  });
});

describe("ProfilePage - profil privé", () => {
  const privateProfile = () => makeProfile({ perms: { profile: false, stats: true, favorites: true, history: true, dashboard: true } });

  it("affiche l'erreur d'accès privé à un visiteur quand le profil n'est pas public", async () => {
    h.getProfile.mockResolvedValue(privateProfile());
    await renderPage("autre");
    expect(screen.getByText(t.error.title1)).toBeInTheDocument();
    expect(screen.getByText(t.error.message1)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByText("Ma bio")).toBeNull();
  });

  it("affiche l'erreur d'accès privé à un visiteur anonyme", async () => {
    h.auth = { user: null };
    h.getProfile.mockResolvedValue(privateProfile());
    await renderPage();
    expect(screen.getByText(t.error.title1)).toBeInTheDocument();
  });

  it("montre toujours son profil au propriétaire même s'il n'est pas public", async () => {
    h.getProfile.mockResolvedValue(privateProfile());
    await renderPage("yvan");
    expect(screen.getByRole("heading", { level: 1, name: "Yvan" })).toBeInTheDocument();
    expect(screen.queryByText(t.error.title1)).toBeNull();
  });
});

describe("ProfilePage - données incomplètes", () => {
  it("remplace l'image absente d'un titre récent par un bloc neutre", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ recent_tracks: [{ ...track(1), image_url: null }, { ...track(2), image_url: "" }] }));
    await renderPage();
    expect(screen.getAllByTestId("track-image-fallback")).toHaveLength(2);
    expect(screen.queryByAltText("Titre 1")).toBeNull();
    expect(screen.getByText("Titre 1")).toBeInTheDocument();
  });

  it.each([[undefined], [null], [""], ["pas une date"]])("affiche « — » pour la date de lecture %j", async (played_at) => {
    h.getProfile.mockResolvedValue(makeProfile({ recent_tracks: [{ ...track(1), played_at }] }));
    await renderPage();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).toBeNull();
  });

  it("ne plante pas quand total_minutes, total_streams et peak_hour sont absents ou null", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ total_minutes: null, total_streams: undefined, peak_hour: null }));
    await renderPage();
    expect(screen.getByText(`(${dict.unitDays(0)})`)).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});

describe("ProfilePage - contenu", () => {
  it("affiche avatar, bannière, nom et bio", async () => {
    await renderPage();
    expect(screen.getByAltText("Avatar")).toHaveAttribute("src", "av.jpg");
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "ban.jpg");
    expect(screen.getByText("Ma bio")).toBeInTheDocument();
  });

  it.each([["/banner_template.jpg"], [null], [undefined], [""]])("utilise l'image de bannière optimisée pour la valeur %j", async (banner) => {
    h.getProfile.mockResolvedValue(makeProfile({ banner }));
    await renderPage();
    const src = screen.getByAltText("Bannière").getAttribute("src") ?? "";
    expect(src).toContain("banner_template_1100x390");
  });

  it("n'affiche pas la bannière par défaut quand une bannière personnalisée existe", async () => {
    await renderPage();
    expect(screen.getByAltText("Bannière").getAttribute("src")).toBe("ban.jpg");
  });

  it("affiche les cartes de statistiques formatées", async () => {
    await renderPage();
    expect(screen.getByText(dict.statTime)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: new RegExp(`${fmt(3000).replace(" ", "\\s")}\\s${dict.unitMin}`) })).toBeInTheDocument();
    expect(screen.getByText(`(${dict.unitDays(2)})`)).toBeInTheDocument();
    expect(screen.getByText(fmt(1500))).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("BestTrack")).toBeInTheDocument();
    expect(screen.getByText("BestArtist")).toBeInTheDocument();
  });

  it.each([
    [0, 0],
    [1439, 0],
    [1440, 1],
    [2880, 2],
  ])("convertit %i minutes en %i jour(s) (arrondi inférieur)", async (min, days) => {
    h.getProfile.mockResolvedValue(makeProfile({ total_minutes: min }));
    await renderPage();
    expect(screen.getByText(`(${dict.unitDays(days)})`)).toBeInTheDocument();
  });

  it("affiche 0 pour une heure de pointe à 0 et des streams à 0", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ peak_hour: 0, total_streams: 0 }));
    await renderPage();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });

  it("masque les statistiques sans permission stats", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ perms: { ...makeProfile().perms, stats: false } }));
    await renderPage();
    expect(screen.queryByText(dict.statTime)).toBeNull();
  });

  it("masque le lien des statistiques détaillées sans permission dashboard", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ perms: { ...makeProfile().perms, dashboard: false } }));
    await renderPage();
    expect(screen.queryByText(dict.detailedStats)).toBeNull();
  });

  it("affiche les trois sections de favoris", async () => {
    await renderPage();
    for (const title of [dict.topTracks, dict.topAlbums, dict.topArtists]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("masque les favoris sans permission favorites", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ perms: { ...makeProfile().perms, favorites: false } }));
    await renderPage();
    expect(screen.queryByText(dict.topTracks)).toBeNull();
  });

  it("affiche les favoris albums/artistes même si le top 50 morceaux est vide", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ top_50_tracks: [] }));
    await renderPage();
    expect(screen.getByText(dict.topAlbums)).toBeInTheDocument();
  });

  it("liste les écoutes récentes avec date localisée", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: dict.recentHistory })).toBeInTheDocument();
    expect(screen.getByText("Titre 1")).toBeInTheDocument();
    expect(screen.getByText("Artiste 2")).toBeInTheDocument();
    expect(screen.getByAltText("Titre 1")).toHaveAttribute("src", "t1.jpg");
    expect(screen.getAllByText(new Date("2024-03-05T10:00:00Z").toLocaleDateString(t.common.locale))).toHaveLength(2);
  });

  it("masque l'historique sans permission history", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ perms: { ...makeProfile().perms, history: false } }));
    await renderPage();
    expect(screen.queryByText(dict.recentHistory)).toBeNull();
  });

  it("affiche « Aucune écoute » quand il n'y a aucune écoute récente", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ top_50_tracks: [], recent_tracks: [] }));
    await renderPage();
    expect(screen.getByText(dict.noHistory)).toBeInTheDocument();
  });

  it("affiche les écoutes récentes même si le top 50 est vide", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ top_50_tracks: [], recent_tracks: [track(1)] }));
    await renderPage();
    expect(screen.getByText("Titre 1")).toBeInTheDocument();
    expect(screen.queryByText(dict.noHistory)).toBeNull();
  });

  it("affiche « Aucune écoute » quand recent_tracks est vide même avec un top 50", async () => {
    h.getProfile.mockResolvedValue(makeProfile({ recent_tracks: [] }));
    await renderPage();
    expect(screen.getByText(dict.noHistory)).toBeInTheDocument();
  });
});

describe("ProfilePage - propriétaire", () => {
  it("propose Modifier le profil au propriétaire (slug, insensible à la casse)", async () => {
    await renderPage("YVAN");
    expect(screen.getByRole("button", { name: dict.editBtn })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.followBtn })).toBeNull();
  });

  it("reconnaît le propriétaire par son id", async () => {
    h.auth = { user: { id: 42, slug: "" } };
    await renderPage("42");
    expect(screen.getByRole("button", { name: dict.editBtn })).toBeInTheDocument();
  });

  it("propose Suivre à un autre utilisateur", async () => {
    await renderPage("autre");
    expect(screen.getByRole("button", { name: dict.followBtn })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dict.editBtn })).toBeNull();
  });

  it("propose Suivre à un visiteur anonyme", async () => {
    h.auth = { user: null };
    await renderPage();
    expect(screen.getByRole("button", { name: dict.followBtn })).toBeInTheDocument();
  });

  it("un utilisateur sans slug ni id ne devient jamais propriétaire", async () => {
    h.auth = { user: {} };
    await renderPage("undefinedx");
    expect(screen.getByRole("button", { name: dict.followBtn })).toBeInTheDocument();
  });

  it("le bouton Modifier navigue vers l'édition", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("button", { name: dict.editBtn }));
    expect(h.push).toHaveBeenCalledWith(FRONT_ROUTES.PROFILE_EDIT);
  });
});

describe("ProfilePage - interactions", () => {
  it("le lien de statistiques détaillées navigue vers le dashboard de l'id", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByText(dict.detailedStats));
    expect(h.push).toHaveBeenCalledWith("/profile/dashboard/yvan");
  });

  it("le lien de statistiques détaillées est un bouton accessible au clavier", async () => {
    const user = userEvent.setup();
    await renderPage();
    const btn = screen.getByRole("button", { name: new RegExp(dict.detailedStats) });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(h.push).toHaveBeenCalledWith("/profile/dashboard/yvan");
  });

  it("le bouton de partage copie l'URL et affiche un toast de succès", async () => {
    const user = userEvent.setup();
    await renderPage();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: dict.shareBtn }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith(dict.copySuccess, expect.any(Object)));
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("affiche un toast d'erreur si la copie échoue", async () => {
    const user = userEvent.setup();
    await renderPage();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("refusé"));
    await user.click(screen.getByRole("button", { name: dict.shareBtn }));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith(dict.copyError));
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it("le bouton de partage a un nom accessible", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: dict.shareBtn })).toBeInTheDocument();
  });
});
