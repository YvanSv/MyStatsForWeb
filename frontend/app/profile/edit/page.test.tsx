/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaultAvatar } from "@/app/constants/images";
import { SITE_HOST } from "@/app/constants/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../../constants/locales/lang";
import EditProfilePage from "./page";

const dict = languages.fr.profileEdit;
const errDict = languages.fr.account;

const h = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  refreshUser: vi.fn(),
  getEditableProfile: vi.fn(),
  patchProfile: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  auth: { user: { id: 1 } } as { user: any },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, back: h.back }) }));
vi.mock("../../context/authContext", () => ({
  useAuth: () => ({ user: h.auth.user, refreshUser: h.refreshUser }),
}));
vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("../../components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) =>
    h.auth.user ? <>{children}</> : <div data-testid="skeleton">{skeleton}</div>,
}));
vi.mock("../../hooks/useProfile", () => ({
  useProfile: () => ({ getEditableProfile: h.getEditableProfile, patchProfile: h.patchProfile }),
}));
vi.mock("react-hot-toast", () => ({ default: h.toast }));

const profile = (over: Record<string, any> = {}) => ({
  display_name: "Yvan",
  bio: "Ma bio",
  slug: "yvan",
  avatar_url: "https://img/a.png",
  banner_url: "https://img/b.png",
  perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true },
  ...over,
});

const nameInput = () => screen.getByPlaceholderText(dict.placeholderName) as HTMLInputElement;
const bioInput = () => screen.getByPlaceholderText(dict.placeholderBio) as HTMLTextAreaElement;
const slugInput = () => screen.getByPlaceholderText(dict.placeholderUrl) as HTMLInputElement;
const saveBtn = () => screen.getByRole("button", { name: dict.btnSave });
// Le titre est le <p> en font-medium (la description est un autre <p>)
const switchOf = (title: string) =>
  screen.getAllByText(title).find((el) => el.className.includes("font-medium"))!.parentElement!
    .nextElementSibling as HTMLElement;

const renderLoaded = async (data: any = profile()) => {
  h.getEditableProfile.mockResolvedValue(data);
  const utils = render(<EditProfilePage />);
  await screen.findByPlaceholderText(dict.placeholderName);
  return utils;
};

const setValue = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

beforeEach(() => {
  h.push.mockReset();
  h.back.mockReset();
  h.refreshUser.mockReset();
  h.refreshUser.mockResolvedValue(undefined);
  h.getEditableProfile.mockReset();
  h.patchProfile.mockReset();
  h.patchProfile.mockResolvedValue({});
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.auth.user = { id: 1 };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("EditProfilePage – chargement", () => {
  it("affiche le squelette de ProtectedRoute quand l'utilisateur est absent", () => {
    h.auth.user = null;
    render(<EditProfilePage />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(h.getEditableProfile).not.toHaveBeenCalled();
  });

  it("affiche le squelette tant que le profil n'est pas arrivé", async () => {
    let resolve!: (v: any) => void;
    h.getEditableProfile.mockReturnValue(new Promise((r) => (resolve = r)));
    const { container } = render(<EditProfilePage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(dict.placeholderName)).toBeNull();
    await act(async () => resolve(profile()));
    expect(await screen.findByPlaceholderText(dict.placeholderName)).toBeInTheDocument();
  });

  it("charge le profil de l'utilisateur courant (id converti en chaîne)", async () => {
    await renderLoaded();
    expect(h.getEditableProfile).toHaveBeenCalledTimes(1);
    expect(h.getEditableProfile).toHaveBeenCalledWith("1");
  });

  it("n'appelle pas l'API si l'utilisateur n'a pas d'id", async () => {
    h.auth.user = { name: "x" };
    render(<EditProfilePage />);
    expect(h.getEditableProfile).not.toHaveBeenCalled();
    // reste sur le squelette
    expect(screen.queryByPlaceholderText(dict.placeholderName)).toBeNull();
  });

  it("préremplit les champs avec le profil reçu", async () => {
    await renderLoaded();
    expect(nameInput()).toHaveValue("Yvan");
    expect(bioInput()).toHaveValue("Ma bio");
    expect(slugInput()).toHaveValue("yvan");
    expect(screen.getByAltText("Aperçu de l'avatar")).toHaveAttribute("src", "https://img/a.png");
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "https://img/b.png");
  });

  it("affiche titres, libellés et indications", async () => {
    await renderLoaded();
    for (const txt of [dict.title, dict.subtitle, dict.labelName, dict.labelBio, dict.labelUrl, dict.urlHint, dict.labelPrivacy, dict.changeBanner, dict.btnCancel, dict.btnSave]) {
      expect(screen.getByText(txt)).toBeInTheDocument();
    }
  });

  it("données nulles : champs vides, avatar par défaut et bannière par défaut", async () => {
    await renderLoaded({ display_name: null, bio: null, slug: null, avatar_url: null, banner_url: null, perms: null });
    expect(nameInput()).toHaveValue("");
    expect(bioInput()).toHaveValue("");
    expect(slugInput()).toHaveValue("");
    expect(screen.getByAltText("Aperçu de l'avatar")).toHaveAttribute("src", defaultAvatar(1));
    expect(screen.getByAltText("Bannière").getAttribute("src")).toContain("banner_template_1100x390");
  });

  it("slug absent (undefined) : le champ reste utilisable", async () => {
    const { slug, ...rest } = profile();
    void slug;
    await renderLoaded(rest);
    expect(slugInput()).toHaveValue("");
    setValue(slugInput(), "abc");
    expect(slugInput()).toHaveValue("abc");
  });

  it("échec du chargement : erreur loguée, état d'erreur affiché et aucun formulaire", async () => {
    h.getEditableProfile.mockRejectedValue(new Error("boom"));
    render(<EditProfilePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(dict.errorLoad);
    expect(console.error).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(dict.placeholderName)).toBeNull();
    expect(screen.queryByRole("button", { name: dict.btnSave })).toBeNull();
    expect(h.patchProfile).not.toHaveBeenCalled();
  });

  it("échec du chargement : Réessayer relance le chargement et affiche le formulaire une fois réussi", async () => {
    h.getEditableProfile.mockRejectedValueOnce(new Error("boom"));
    h.getEditableProfile.mockResolvedValueOnce(profile());
    render(<EditProfilePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: languages.fr.error.retry }));
    expect(await screen.findByPlaceholderText(dict.placeholderName)).toHaveValue("Yvan");
    expect(h.getEditableProfile).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("échec du chargement : un nouvel échec reste sur l'état d'erreur", async () => {
    h.getEditableProfile.mockRejectedValue(new Error("boom"));
    render(<EditProfilePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: languages.fr.error.retry }));
    await waitFor(() => expect(h.getEditableProfile).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(dict.placeholderName)).toBeNull();
  });

  it("un nouvel objet utilisateur de même id ne recharge pas le profil et conserve les saisies", async () => {
    const { rerender } = await renderLoaded();
    setValue(nameInput(), "Brouillon");
    h.auth.user = { id: 1, name: "autre objet" };
    rerender(<EditProfilePage />);
    expect(h.getEditableProfile).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("Brouillon");
  });

  it("un changement d'identifiant d'utilisateur recharge le profil", async () => {
    const { rerender } = await renderLoaded();
    h.auth.user = { id: 2 };
    rerender(<EditProfilePage />);
    await waitFor(() => expect(h.getEditableProfile).toHaveBeenCalledWith("2"));
    expect(h.getEditableProfile).toHaveBeenCalledTimes(2);
  });

  it("un nom invalide chargé depuis l'API affiche l'erreur dès le chargement et bloque l'enregistrement", async () => {
    await renderLoaded(profile({ display_name: "ab" }));
    expect(screen.getByText(errDict.errorName1)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("une bio trop longue chargée depuis l'API affiche l'erreur dès le chargement et bloque l'enregistrement", async () => {
    await renderLoaded(profile({ bio: "a".repeat(501) }));
    expect(screen.getByText(dict.errorBio)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("un slug invalide chargé depuis l'API affiche l'erreur dès le chargement et bloque l'enregistrement", async () => {
    await renderLoaded(profile({ slug: "12345" }));
    expect(screen.getByText(dict.errorSlugNumeric)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });
});

describe("EditProfilePage – compteurs de caractères", () => {
  it("affiche les compteurs nom/bio/slug", async () => {
    await renderLoaded();
    expect(screen.getByText("4/20")).toBeInTheDocument();
    expect(screen.getByText("6/500")).toBeInTheDocument();
    expect(screen.getByText("4/30")).toBeInTheDocument();
  });

  it("compteur du nom : rouge < 3, normal, jaune > 14, orange > 17, rouge à 20", async () => {
    await renderLoaded();
    const counter = () => screen.getByText(/\/20$/);
    setValue(nameInput(), "ab");
    expect(counter()).toHaveClass("text-rouge");
    setValue(nameInput(), "a".repeat(14));
    expect(counter()).toHaveClass("text2");
    setValue(nameInput(), "a".repeat(15));
    expect(counter()).toHaveClass("text-jaune");
    setValue(nameInput(), "a".repeat(18));
    expect(counter()).toHaveClass("text-orange");
    setValue(nameInput(), "a".repeat(20));
    expect(counter()).toHaveClass("text-rouge");
  });

  it("compteur de la bio : seuils 400 / 450 / 500", async () => {
    await renderLoaded();
    const counter = () => screen.getByText(/\/500$/);
    setValue(bioInput(), "a".repeat(400));
    expect(counter()).toHaveClass("text2");
    setValue(bioInput(), "a".repeat(401));
    expect(counter()).toHaveClass("text-jaune");
    setValue(bioInput(), "a".repeat(451));
    expect(counter()).toHaveClass("text-orange");
    setValue(bioInput(), "a".repeat(500));
    expect(counter()).toHaveClass("text-rouge");
  });

  it("compteur du slug : normal, jaune > 20, orange > 25, rouge à 30", async () => {
    await renderLoaded();
    const counter = () => screen.getByText(/\/30$/);
    setValue(slugInput(), "a".repeat(20));
    expect(counter()).toHaveClass("text2");
    setValue(slugInput(), "a".repeat(21));
    expect(counter()).toHaveClass("text-jaune");
    setValue(slugInput(), "a".repeat(26));
    expect(counter()).toHaveClass("text-orange");
    setValue(slugInput(), "a".repeat(30));
    expect(counter()).toHaveClass("text-rouge");
  });
});

describe("EditProfilePage – validation du nom", () => {
  it("moins de 3 caractères : message d'erreur et bouton désactivé", async () => {
    await renderLoaded();
    setValue(nameInput(), "ab");
    expect(screen.getByText(errDict.errorName1)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("exactement 3 caractères : valide", async () => {
    await renderLoaded();
    setValue(nameInput(), "abc");
    expect(screen.queryByText(errDict.errorName1)).toBeNull();
    expect(saveBtn()).toBeEnabled();
  });

  it("exactement 20 caractères : valide ; 21 : erreur de longueur", async () => {
    await renderLoaded();
    setValue(nameInput(), "a".repeat(20));
    expect(screen.queryByText(errDict.errorName2)).toBeNull();
    setValue(nameInput(), "a".repeat(21));
    expect(screen.getByText(errDict.errorName2)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("l'erreur disparaît quand le nom redevient valide", async () => {
    await renderLoaded();
    setValue(nameInput(), "a");
    setValue(nameInput(), "abcd");
    expect(screen.queryByText(errDict.errorName1)).toBeNull();
    expect(saveBtn()).toBeEnabled();
  });

  it("nom vide : erreur affichée", async () => {
    await renderLoaded();
    setValue(nameInput(), "");
    expect(screen.getByText(errDict.errorName1)).toBeInTheDocument();
  });

  it("la saisie au clavier est répercutée dans le champ", async () => {
    await renderLoaded({ ...profile(), display_name: "" });
    await userEvent.setup().type(nameInput(), "Zoé");
    expect(nameInput()).toHaveValue("Zoé");
  });
});

describe("EditProfilePage – validation de la bio", () => {
  it("501 caractères : message d'erreur et bouton désactivé", async () => {
    await renderLoaded();
    setValue(bioInput(), "a".repeat(501));
    expect(screen.getByText(dict.errorBio)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("500 caractères : pas d'erreur", async () => {
    await renderLoaded();
    setValue(bioInput(), "a".repeat(500));
    expect(screen.queryByText(dict.errorBio)).toBeNull();
    expect(saveBtn()).toBeEnabled();
  });

  it("l'erreur de bio disparaît et le bouton se réactive quand la bio redevient valide", async () => {
    await renderLoaded();
    setValue(bioInput(), "a".repeat(501));
    setValue(bioInput(), "a".repeat(10));
    expect(screen.queryByText(dict.errorBio)).toBeNull();
    expect(saveBtn()).toBeEnabled();
  });

  it("corriger la bio ne doit pas effacer une erreur de nom", async () => {
    await renderLoaded();
    setValue(nameInput(), "a");
    setValue(bioInput(), "nouvelle bio");
    expect(screen.getByText(errDict.errorName1)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("bio vide acceptée", async () => {
    await renderLoaded();
    setValue(bioInput(), "");
    expect(saveBtn()).toBeEnabled();
  });
});

describe("EditProfilePage – slug", () => {
  it("met en minuscules", async () => {
    await renderLoaded();
    setValue(slugInput(), "ABC");
    expect(slugInput()).toHaveValue("abc");
  });

  it("remplace les espaces par des tirets", async () => {
    await renderLoaded();
    setValue(slugInput(), "mon super nom");
    expect(slugInput()).toHaveValue("mon-super-nom");
  });

  it("supprime les caractères non autorisés", async () => {
    await renderLoaded();
    setValue(slugInput(), "a_b.c!é$d");
    expect(slugInput()).toHaveValue("abcd");
  });

  it("accepte la saisie d'un nombre pur mais affiche l'erreur et bloque l'enregistrement", async () => {
    await renderLoaded();
    setValue(slugInput(), "12345");
    expect(slugInput()).toHaveValue("12345");
    expect(screen.getByText(dict.errorSlugNumeric)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it.each(["dashboard", "edit", "settings", "admin", "login", "api"])("accepte la saisie du mot réservé « %s » avec une erreur explicite", async (word) => {
    await renderLoaded();
    setValue(slugInput(), word);
    expect(slugInput()).toHaveValue(word);
    expect(screen.getByText(dict.errorSlugReserved)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("accepte un mot contenant un mot réservé", async () => {
    await renderLoaded();
    setValue(slugInput(), "admin2");
    expect(slugInput()).toHaveValue("admin2");
  });

  it("30 caractères valides ; 31 caractères acceptés en saisie avec une erreur de longueur", async () => {
    await renderLoaded();
    setValue(slugInput(), "a".repeat(30));
    expect(screen.queryByText(dict.errorSlugLength)).toBeNull();
    expect(saveBtn()).toBeEnabled();
    setValue(slugInput(), "a".repeat(31));
    expect(slugInput()).toHaveValue("a".repeat(31));
    expect(screen.getByText(dict.errorSlugLength)).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it("l'erreur de slug disparaît quand la valeur redevient valide ; un slug vide est valide", async () => {
    await renderLoaded();
    setValue(slugInput(), "admin");
    setValue(slugInput(), "admin-2");
    expect(screen.queryByText(dict.errorSlugReserved)).toBeNull();
    expect(saveBtn()).toBeEnabled();
    setValue(slugInput(), "123");
    setValue(slugInput(), "");
    expect(screen.queryByText(dict.errorSlugNumeric)).toBeNull();
    expect(saveBtn()).toBeEnabled();
  });

  it("n'envoie rien tant que le slug est invalide", async () => {
    await renderLoaded();
    setValue(slugInput(), "admin");
    await userEvent.setup().click(saveBtn());
    expect(h.patchProfile).not.toHaveBeenCalled();
  });

  it("permet de vider le champ", async () => {
    await renderLoaded();
    setValue(slugInput(), "");
    expect(slugInput()).toHaveValue("");
  });

  it("affiche le préfixe d'URL", async () => {
    await renderLoaded();
    expect(screen.getByText(`${SITE_HOST}/profile/`)).toBeInTheDocument();
  });
});

describe("EditProfilePage – permissions", () => {
  const titles = ["Profil public", "Statistiques public", "Favoris public", "Historique public", "Dashboard public"];

  it("affiche cinq interrupteurs", async () => {
    await renderLoaded();
    expect(titles.map((t) => switchOf(t))).toHaveLength(5);
  });

  it("désactiver « Profil public » désactive toutes les autres permissions", async () => {
    await renderLoaded();
    await userEvent.setup().click(switchOf("Profil public"));
    for (const t of titles) expect(switchOf(t)).toHaveClass("bg-white/10");
  });

  it("quand le profil est privé, les autres options sont grisées", async () => {
    await renderLoaded();
    await userEvent.setup().click(switchOf("Profil public"));
    for (const t of titles.slice(1)) {
      expect(switchOf(t).parentElement).toHaveClass("pointer-events-none");
    }
    expect(switchOf("Profil public").parentElement).not.toHaveClass("pointer-events-none");
  });

  it("réactiver le profil restaure les autres permissions telles qu'avant le décochage", async () => {
    await renderLoaded(profile({ perms: { profile: true, stats: true, favorites: false, history: true, dashboard: false } }));
    const user = userEvent.setup();
    await user.click(switchOf("Profil public"));
    expect(switchOf("Statistiques public")).toHaveClass("bg-white/10");
    await user.click(switchOf("Profil public"));
    expect(switchOf("Profil public")).toHaveClass("bg-vert");
    expect(switchOf("Statistiques public")).toHaveClass("bg-vert");
    expect(switchOf("Favoris public")).toHaveClass("bg-white/10");
    expect(switchOf("Historique public")).toHaveClass("bg-vert");
    expect(switchOf("Dashboard public")).toHaveClass("bg-white/10");
  });

  it("les interrupteurs dépendants restent désactivés tant que le profil est privé", async () => {
    await renderLoaded();
    await userEvent.setup().click(switchOf("Profil public"));
    for (const t of titles.slice(1)) expect(switchOf(t)).toBeDisabled();
    await userEvent.setup().click(switchOf("Profil public"));
    for (const t of titles.slice(1)) expect(switchOf(t)).toBeEnabled();
  });

  it("une permission modifiée avant le décochage est celle restaurée", async () => {
    await renderLoaded();
    const user = userEvent.setup();
    await user.click(switchOf("Favoris public"));
    await user.click(switchOf("Profil public"));
    await user.click(switchOf("Profil public"));
    expect(switchOf("Favoris public")).toHaveClass("bg-white/10");
    expect(switchOf("Statistiques public")).toHaveClass("bg-vert");
  });

  it("décocher puis recocher le profil envoie les permissions d'origine", async () => {
    await renderLoaded();
    const user = userEvent.setup();
    await user.click(switchOf("Profil public"));
    await user.click(switchOf("Profil public"));
    await user.click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.patchProfile.mock.calls[0][1].perms).toEqual({ profile: true, stats: true, favorites: true, history: true, dashboard: true });
  });

  it("bascule individuellement une option sans toucher aux autres", async () => {
    await renderLoaded();
    await userEvent.setup().click(switchOf("Favoris public"));
    expect(switchOf("Favoris public")).toHaveClass("bg-white/10");
    expect(switchOf("Statistiques public")).toHaveClass("bg-vert");
    expect(switchOf("Profil public")).toHaveClass("bg-vert");
  });

  it("utilise les permissions du profil chargé", async () => {
    await renderLoaded(profile({ perms: { profile: true, stats: false, favorites: true, history: false, dashboard: true } }));
    expect(switchOf("Statistiques public")).toHaveClass("bg-white/10");
    expect(switchOf("Historique public")).toHaveClass("bg-white/10");
    expect(switchOf("Favoris public")).toHaveClass("bg-vert");
  });

  it("affiche les descriptions du dictionnaire pour chaque option", async () => {
    await renderLoaded();
    for (const d of [dict.descProfile, dict.descStats, dict.descFavs, dict.descHistory, dict.descDash]) {
      expect(screen.getByText(d)).toBeInTheDocument();
    }
  });

  it("utilise les titres du dictionnaire (traduisibles)", async () => {
    await renderLoaded();
    for (const d of [dict.toggleProfile, dict.toggleStats, dict.toggleFavs, dict.toggleHistory, dict.toggleDash]) {
      // chaque titre n'apparaît qu'une fois (pas en description)
      expect(screen.getAllByText(d)).toHaveLength(1);
    }
  });
});

describe("EditProfilePage – sauvegarde", () => {
  it("envoie le PATCH avec les données du formulaire puis toast, refreshUser et redirection vers le slug", async () => {
    await renderLoaded();
    setValue(nameInput(), "Nouveau");
    setValue(bioInput(), "Autre bio");
    setValue(slugInput(), "Mon Slug");
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile/mon-slug"));
    expect(h.patchProfile).toHaveBeenCalledTimes(1);
    expect(h.patchProfile).toHaveBeenCalledWith("1", {
      display_name: "Nouveau",
      bio: "Autre bio",
      slug: "mon-slug",
      perms: { profile: true, stats: true, favorites: true, history: true, dashboard: true },
    });
    expect(h.toast.success).toHaveBeenCalledWith(dict.successToast, expect.any(Object));
    expect(h.refreshUser).toHaveBeenCalledTimes(1);
  });

  it("slug vide : envoie slug null et redirige vers l'id", async () => {
    await renderLoaded();
    setValue(slugInput(), "");
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile/1"));
    expect(h.patchProfile.mock.calls[0][1].slug).toBeNull();
  });

  it("slug absent du profil : envoie null et redirige vers l'id", async () => {
    await renderLoaded(profile({ slug: null }));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile/1"));
    expect(h.patchProfile.mock.calls[0][1].slug).toBeNull();
  });

  it("envoie les permissions modifiées", async () => {
    await renderLoaded();
    const user = userEvent.setup();
    await user.click(switchOf("Profil public"));
    await user.click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.patchProfile.mock.calls[0][1].perms).toEqual({ profile: false, stats: false, favorites: false, history: false, dashboard: false });
  });

  it("avatar et bannière inchangés sont omis du PATCH", async () => {
    await renderLoaded();
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    const payload = h.patchProfile.mock.calls[0][1];
    expect(payload).not.toHaveProperty("avatar_url");
    expect(payload).not.toHaveProperty("banner_url");
  });

  it("avatar par défaut et bannière par défaut non modifiés ne sont pas enregistrés", async () => {
    await renderLoaded(profile({ avatar_url: null, banner_url: null }));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    const payload = h.patchProfile.mock.calls[0][1];
    expect(payload).not.toHaveProperty("avatar_url");
    expect(payload).not.toHaveProperty("banner_url");
  });

  it("seule l'image modifiée est envoyée (bannière changée, avatar inchangé)", async () => {
    const { container } = await renderLoaded();
    const file = new File([new Uint8Array(10)], "x.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(container.querySelectorAll<HTMLInputElement>('input[type="file"]')[0], { target: { files: [file] } });
    });
    await waitFor(() => expect(screen.getByAltText("Bannière").getAttribute("src")).toMatch(/^data:/));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    const payload = h.patchProfile.mock.calls[0][1];
    expect(payload.banner_url).toMatch(/^data:image\/png/);
    expect(payload).not.toHaveProperty("avatar_url");
  });
});

describe("EditProfilePage – enregistrement en cours", () => {
  const pending = () => {
    let resolve!: (v?: unknown) => void;
    let reject!: (e: unknown) => void;
    h.patchProfile.mockReturnValue(new Promise((res, rej) => { resolve = res; reject = rej; }));
    return { resolve: () => resolve({}), reject: (e: unknown) => reject(e) };
  };

  it("un double clic n'envoie qu'un seul PATCH", async () => {
    await renderLoaded();
    pending();
    const btn = saveBtn();
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    expect(h.patchProfile).toHaveBeenCalledTimes(1);
  });

  it("pendant l'enregistrement : bouton désactivé avec le libellé « Enregistrement... » et Annuler reste possible", async () => {
    await renderLoaded();
    pending();
    await userEvent.setup().click(saveBtn());
    const btn = await screen.findByRole("button", { name: dict.saving });
    expect(btn).toBeDisabled();
    expect(screen.queryByRole("button", { name: dict.btnSave })).toBeNull();
    const cancel = screen.getByRole("button", { name: dict.btnCancel });
    expect(cancel).toBeEnabled();
    await userEvent.setup().click(cancel);
    expect(h.back).toHaveBeenCalledTimes(1);
  });

  it("après une erreur, le bouton redevient actif et un nouvel envoi est possible", async () => {
    await renderLoaded();
    const p = pending();
    const user = userEvent.setup();
    await user.click(saveBtn());
    await act(async () => p.reject(Object.assign(new Error("fail"), { status: 500 })));
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    h.patchProfile.mockResolvedValue({});
    await user.click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalledTimes(2));
  });
});

describe("EditProfilePage – saisies et états concurrents", () => {
  it("lire un fichier d'avatar puis une bannière n'écrase pas l'autre image ni les champs (état à jour)", async () => {
    const { container } = await renderLoaded();
    const inputsList = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const file = new File([new Uint8Array(10)], "x.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(inputsList[0], { target: { files: [file] } });
      fireEvent.change(inputsList[1], { target: { files: [file] } });
      setValue(nameInput(), "Pendant lecture");
    });
    await waitFor(() => {
      expect(screen.getByAltText("Bannière").getAttribute("src")).toMatch(/^data:/);
      expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:/);
    });
    expect(nameInput()).toHaveValue("Pendant lecture");
  });

  it("deux saisies consécutives dans le même rendu sont toutes deux conservées", async () => {
    await renderLoaded();
    await act(async () => {
      setValue(nameInput(), "Nouveau nom");
      setValue(bioInput(), "Nouvelle bio");
    });
    expect(nameInput()).toHaveValue("Nouveau nom");
    expect(bioInput()).toHaveValue("Nouvelle bio");
  });
});

describe("EditProfilePage – sauvegarde (suite)", () => {
  it("erreur de l'API : pas de toast de succès, pas de redirection, pas de rejet non géré", async () => {
    await renderLoaded();
    h.patchProfile.mockRejectedValue(Object.assign(new Error("fail"), { status: 500 }));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.toast.success).not.toHaveBeenCalled();
    expect(h.refreshUser).not.toHaveBeenCalled();
    expect(h.push).not.toHaveBeenCalled();
    expect(saveBtn()).toBeEnabled();
  });

  it("erreur 422 : aucune redirection", async () => {
    await renderLoaded();
    h.patchProfile.mockRejectedValue(Object.assign(new Error("invalid"), { status: 422 }));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.push).not.toHaveBeenCalled();
  });

  it("erreur de l'API : l'utilisateur est informé de l'échec", async () => {
    await renderLoaded();
    h.patchProfile.mockRejectedValue(Object.assign(new Error("fail"), { status: 500 }));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.toast.error).toHaveBeenCalled();
  });

  it("n'envoie rien quand le formulaire est invalide", async () => {
    await renderLoaded();
    setValue(nameInput(), "a");
    await userEvent.setup().click(saveBtn());
    expect(h.patchProfile).not.toHaveBeenCalled();
  });

  it("si refreshUser échoue : aucune redirection et pas de rejet non géré", async () => {
    await renderLoaded();
    h.refreshUser.mockRejectedValue(new Error("refresh"));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.refreshUser).toHaveBeenCalled());
    expect(h.push).not.toHaveBeenCalled();
  });
});

describe("EditProfilePage – annulation", () => {
  it("le bouton Annuler revient à la page précédente sans sauvegarder", async () => {
    await renderLoaded();
    await userEvent.setup().click(screen.getByRole("button", { name: dict.btnCancel }));
    expect(h.back).toHaveBeenCalledTimes(1);
    expect(h.patchProfile).not.toHaveBeenCalled();
  });
});

describe("EditProfilePage – images", () => {
  const inputs = (c: HTMLElement) => c.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const readAs = async (container: HTMLElement, index: number, file: File) => {
    await act(async () => {
      fireEvent.change(inputs(container)[index], { target: { files: [file] } });
    });
  };
  const png = (size = 10) => new File([new Uint8Array(size)], "x.png", { type: "image/png" });

  it("expose deux champs fichier cachés acceptant PNG, JPEG, WebP et GIF (pas de SVG)", async () => {
    const { container } = await renderLoaded();
    const list = inputs(container);
    expect(list).toHaveLength(2);
    list.forEach((i) => {
      expect(i).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");
      expect(i.getAttribute("accept")).not.toContain("svg");
    });
  });

  it.each([
    ["SVG", "image/svg+xml", "x.svg"],
    ["PDF", "application/pdf", "x.pdf"],
    ["type vide", "", "x"],
  ])("fichier %s refusé pour la bannière et l'avatar : alerte et image inchangée", async (_l, type, name) => {
    const { container } = await renderLoaded();
    const file = new File([new Uint8Array(10)], name, { type });
    await readAs(container, 0, file);
    await readAs(container, 1, file);
    expect(window.alert).toHaveBeenCalledTimes(2);
    expect(window.alert).toHaveBeenCalledWith(dict.errorImageType);
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "https://img/b.png");
    expect(screen.getByAltText("Aperçu de l'avatar")).toHaveAttribute("src", "https://img/a.png");
  });

  it.each(["image/jpeg", "image/webp", "image/gif"])("format %s accepté", async (type) => {
    const { container } = await renderLoaded();
    await readAs(container, 1, new File([new Uint8Array(10)], "x", { type }));
    expect(window.alert).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:image\//));
  });

  it("vide le champ fichier après un refus pour pouvoir re-choisir le même fichier", async () => {
    const { container } = await renderLoaded();
    const input = inputs(container)[1];
    await readAs(container, 1, new File([new Uint8Array(10)], "x.svg", { type: "image/svg+xml" }));
    expect(input.value).toBe("");
  });

  it("un clic sur l'overlay de la bannière ouvre le sélecteur de fichier", async () => {
    const { container } = await renderLoaded();
    const click = vi.spyOn(inputs(container)[0], "click");
    await userEvent.setup().click(screen.getByText(dict.changeBanner));
    expect(click).toHaveBeenCalled();
  });

  it("un clic sur l'overlay de l'avatar ouvre le sélecteur de fichier", async () => {
    const { container } = await renderLoaded();
    const click = vi.spyOn(inputs(container)[1], "click");
    const overlay = container.querySelector(".group-hover\\:opacity-100") as HTMLElement;
    await userEvent.setup().click(overlay);
    expect(click).toHaveBeenCalled();
  });

  it("une bannière valide est lue en data URL et prévisualisée", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 0, png());
    await waitFor(() => expect(screen.getByAltText("Bannière").getAttribute("src")).toMatch(/^data:image\/png/));
  });

  it("un avatar valide est lu en data URL et prévisualisé", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 1, png());
    await waitFor(() => expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:image\/png/));
  });

  it("l'image choisie est envoyée dans le PATCH", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 1, png());
    await waitFor(() => expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:/));
    await userEvent.setup().click(saveBtn());
    await waitFor(() => expect(h.patchProfile).toHaveBeenCalled());
    expect(h.patchProfile.mock.calls[0][1].avatar_url).toMatch(/^data:image\/png/);
  });

  it("bannière > 2 Mo : alerte et image inchangée", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 0, png(2 * 1024 * 1024 + 1));
    expect(window.alert).toHaveBeenCalledWith(dict.errorWeight);
    expect(screen.getByAltText("Bannière")).toHaveAttribute("src", "https://img/b.png");
  });

  it("avatar > 2 Mo : alerte et image inchangée", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 1, png(2 * 1024 * 1024 + 1));
    expect(window.alert).toHaveBeenCalledWith(dict.errorWeight);
    expect(screen.getByAltText("Aperçu de l'avatar")).toHaveAttribute("src", "https://img/a.png");
  });

  it("fichier d'exactement 2 Mo accepté (valeur limite)", async () => {
    const { container } = await renderLoaded();
    await readAs(container, 1, png(2 * 1024 * 1024));
    expect(window.alert).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:/));
  });

  it("aucun fichier sélectionné : rien ne change", async () => {
    const { container } = await renderLoaded();
    await act(async () => {
      fireEvent.change(inputs(container)[1], { target: { files: [] } });
    });
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByAltText("Aperçu de l'avatar")).toHaveAttribute("src", "https://img/a.png");
  });

  it("changer l'avatar après avoir saisi le nom conserve le nom saisi", async () => {
    const { container } = await renderLoaded();
    setValue(nameInput(), "Saisi");
    await readAs(container, 1, png());
    await waitFor(() => expect(screen.getByAltText("Aperçu de l'avatar").getAttribute("src")).toMatch(/^data:/));
    expect(nameInput()).toHaveValue("Saisi");
  });
});

describe("EditProfilePage – accessibilité", () => {
  it("expose un titre de niveau 1", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 1, name: dict.title })).toBeInTheDocument();
  });

  it("le bouton d'enregistrement est un vrai bouton nommé", async () => {
    await renderLoaded();
    expect(saveBtn()).toBeInTheDocument();
  });

  it("les champs sont accessibles par leur libellé", async () => {
    await renderLoaded();
    expect(screen.getByLabelText(dict.labelName)).toBeInTheDocument();
    expect(screen.getByLabelText(dict.labelBio)).toBeInTheDocument();
    expect(screen.getByLabelText(dict.labelUrl)).toBeInTheDocument();
  });

  it("les images ont un texte alternatif", async () => {
    await renderLoaded();
    expect(screen.getByAltText("Bannière")).toBeInTheDocument();
    expect(screen.getByAltText("Aperçu de l'avatar")).toBeInTheDocument();
  });

  it("la navigation clavier atteint les champs puis les boutons", async () => {
    await renderLoaded();
    const user = userEvent.setup();
    nameInput().focus();
    expect(document.activeElement).toBe(nameInput());
    await user.tab();
    expect(document.activeElement).toBe(bioInput());
    await user.tab();
    expect(document.activeElement).toBe(slugInput());
  });

  it("l'overlay de changement de bannière est atteignable au clavier", async () => {
    await renderLoaded();
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
  });
});
