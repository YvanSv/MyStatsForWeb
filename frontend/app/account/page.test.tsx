import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import AccountPage from "./page";

const dict = languages.fr.account;

// --- Mocks -----------------------------------------------------------------

const { mockAuth, toast } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockAuth: {} as Record<string, any>,
  // toast est à la fois une fonction (message neutre) et un objet avec success / error
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../context/authContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
// La protection de route est testée ailleurs : ici on rend directement le contenu
vi.mock("../components/auth/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("react-hot-toast", () => ({ default: toast }));

// --- Helpers ---------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeUser = (overrides: Record<string, any> = {}) => ({
  id: 1,
  user_name: "Yvan",
  slug: "yvan",
  email: "yvan@example.com",
  avatar: "",
  is_logged_in: true,
  isAdmin: false,
  providers: {
    SPOTIFY: { has: false, email: null },
    APPLE_MUSIC: { has: false, email: null },
    MUSICBRAINZ: { has: false, email: null },
  },
  ...overrides,
});

const withSpotify = (email = "yvan@spotify.com") =>
  makeUser({ providers: { ...makeUser().providers, SPOTIFY: { has: true, email } } });

const nameInput = () => screen.getByPlaceholderText(dict.placeholderName) as HTMLInputElement;
const emailInput = () => screen.getByDisplayValue(mockAuth.user.email) as HTMLInputElement;
const pwInput = () => screen.getByPlaceholderText(dict.placeholderPw) as HTMLInputElement;
const confirmInput = () => screen.getByPlaceholderText(dict.placeholderpwc) as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: new RegExp(`${dict.save}|${dict.saving}`) });
const eyeOf = (input: HTMLElement) => input.parentElement!.querySelector("button") as HTMLButtonElement;

const typeInto = async (user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) => {
  await user.clear(input);
  if (text) await user.type(input, text);
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mockAuth, {
    user: makeUser(),
    loading: false,
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    clearAccount: vi.fn().mockResolvedValue(undefined),
    loginSpotify: vi.fn(),
  });
});

// --- Tests -----------------------------------------------------------------

describe("AccountPage – états de chargement", () => {
  it("affiche le squelette tant que l'utilisateur n'est pas chargé", () => {
    mockAuth.user = null;
    const { container } = render(<AccountPage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText(dict.lefttitle)).not.toBeInTheDocument();
  });

  it("affiche le squelette pendant le chargement, même si l'utilisateur est déjà connu", () => {
    mockAuth.loading = true;
    const { container } = render(<AccountPage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(dict.placeholderName)).not.toBeInTheDocument();
  });

  it("affiche le formulaire une fois l'utilisateur chargé", () => {
    const { container } = render(<AccountPage />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
    expect(screen.getByText(dict.lefttitle)).toBeInTheDocument();
    expect(screen.getByText(dict.righttitle)).toBeInTheDocument();
  });
});

describe("AccountPage – préremplissage", () => {
  it("préremplit le nom et l'email avec ceux de l'utilisateur", () => {
    render(<AccountPage />);
    expect(nameInput()).toHaveValue("Yvan");
    expect(emailInput()).toHaveValue("yvan@example.com");
  });

  it("laisse les champs mot de passe vides", () => {
    render(<AccountPage />);
    expect(pwInput()).toHaveValue("");
    expect(confirmInput()).toHaveValue("");
  });

  it("affiche les compteurs de caractères", () => {
    render(<AccountPage />);
    expect(screen.getByText("4/20")).toBeInTheDocument();
    expect(screen.getByText("0/128")).toBeInTheDocument();
  });

  it("met à jour les champs quand l'utilisateur change (ex : après un refresh)", () => {
    const { rerender } = render(<AccountPage />);
    mockAuth.user = makeUser({ user_name: "Nouveau", email: "nouveau@example.com" });
    rerender(<AccountPage />);
    expect(nameInput()).toHaveValue("Nouveau");
    expect(emailInput()).toHaveValue("nouveau@example.com");
  });
});

describe("AccountPage – validation du nom d'affichage", () => {
  it("refuse un nom de moins de 3 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "ab");
    expect(screen.getByText(dict.errorName1)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("accepte un nom de 3 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "abc");
    expect(screen.queryByText(dict.errorName1)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("accepte un nom de 20 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "a".repeat(20));
    expect(screen.queryByText(dict.errorName2)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("refuse un nom de plus de 20 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "a".repeat(21));
    expect(screen.getByText(dict.errorName2)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("efface l'erreur dès que le nom redevient valide", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "ab");
    expect(screen.getByText(dict.errorName1)).toBeInTheDocument();
    await user.type(nameInput(), "c");
    expect(screen.queryByText(dict.errorName1)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("désactive l'enregistrement quand le nom est vide", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "");
    expect(saveButton()).toBeDisabled();
  });

  it.each([
    ["ab", "text-rouge"],
    ["a".repeat(10), "text2"],
    ["a".repeat(14), "text2"],
    ["a".repeat(15), "text-jaune"],
    ["a".repeat(17), "text-jaune"],
    ["a".repeat(18), "text-orange"],
    ["a".repeat(19), "text-orange"],
    ["a".repeat(20), "text-rouge"],
  ])("colore le compteur du nom (%s) avec %s", async (value, cls) => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), value);
    expect(screen.getByText(`${value.length}/20`)).toHaveClass(cls);
  });
});

describe("AccountPage – validation du mot de passe", () => {
  it("n'affiche aucune erreur tant que les deux champs sont vides", () => {
    render(<AccountPage />);
    expect(screen.queryByText(dict.errorPw1)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("refuse un mot de passe de moins de 8 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "1234567");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("accepte un mot de passe de 8 caractères quand la confirmation correspond", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(confirmInput(), "12345678");
    await user.type(pwInput(), "12345678");
    expect(screen.queryByText(dict.errorPw1)).not.toBeInTheDocument();
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("refuse un mot de passe de plus de 128 caractères", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(pwInput());
    await user.paste("a".repeat(129));
    expect(screen.getByText(dict.errorPw2)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("signale que les mots de passe diffèrent dès qu'un mot de passe est saisi sans confirmation", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "motdepasse");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("efface l'erreur de confirmation quand elle correspond au mot de passe", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "motdepasse");
    await user.type(confirmInput(), "motdepasse");
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("signale une confirmation différente du mot de passe", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "motdepasse");
    await user.type(confirmInput(), "autrechose");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("recalcule l'erreur quand le mot de passe est modifié après la confirmation", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(confirmInput(), "motdepasse");
    await user.type(pwInput(), "motdepasse");
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    await user.type(pwInput(), "X");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
  });

  it("affiche la longueur du mot de passe dans le compteur", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "abcde");
    expect(screen.getByText("5/128")).toBeInTheDocument();
  });

  it.each([
    [5, "text-rouge"],
    [8, "text2"],
    [100, "text2"],
    [101, "text-jaune"],
    [114, "text-jaune"],
    [115, "text-orange"],
    [127, "text-orange"],
    [128, "text-rouge"],
  ])("colore le compteur du mot de passe (%i caractères) avec %s", async (length, cls) => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(pwInput());
    await user.paste("a".repeat(length));
    expect(screen.getByText(`${length}/128`)).toHaveClass(cls);
  });
});

describe("AccountPage – afficher / masquer les mots de passe", () => {
  it("masque les mots de passe par défaut", () => {
    render(<AccountPage />);
    expect(pwInput()).toHaveAttribute("type", "password");
    expect(confirmInput()).toHaveAttribute("type", "password");
  });

  it("révèle puis masque le mot de passe avec l'œil", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(eyeOf(pwInput()));
    expect(pwInput()).toHaveAttribute("type", "text");
    await user.click(eyeOf(pwInput()));
    expect(pwInput()).toHaveAttribute("type", "password");
  });

  it("gère l'œil de la confirmation indépendamment de celui du mot de passe", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(eyeOf(confirmInput()));
    expect(confirmInput()).toHaveAttribute("type", "text");
    expect(pwInput()).toHaveAttribute("type", "password");
  });

  it("ne soumet pas le formulaire en cliquant sur l'œil", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(eyeOf(pwInput()));
    expect(mockAuth.updateUserProfile).not.toHaveBeenCalled();
  });
});

describe("AccountPage – enregistrement du profil", () => {
  it("n'envoie que le nom quand seul le nom change", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "Nouveau");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledWith({ username: "Nouveau" });
  });

  it("n'envoie que l'email quand seul l'email change", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, emailInput(), "autre@example.com");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledWith({ email: "autre@example.com" });
  });

  it("envoie le mot de passe quand il est renseigné", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(pwInput(), "motdepasse");
    await user.type(confirmInput(), "motdepasse");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledWith({ password: "motdepasse" });
  });

  it("envoie tous les champs modifiés en une seule requête", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "Nouveau");
    await typeInto(user, emailInput(), "autre@example.com");
    await user.type(pwInput(), "motdepasse");
    await user.type(confirmInput(), "motdepasse");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledWith({
      username: "Nouveau",
      email: "autre@example.com",
      password: "motdepasse",
    });
  });

  it("n'envoie aucune requête quand rien n'a changé, et n'affiche pas de succès", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("prévient avec un message neutre qu'il n'y a rien à enregistrer", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(saveButton());
    expect(toast).toHaveBeenCalledWith(languages.fr.account.noChanges);
  });

  it("rend la main au bouton après un enregistrement sans changement (pas de blocage)", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(saveButton());
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it("n'affiche pas d'erreur d'API après un enregistrement sans changement", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(saveButton());
    expect(screen.queryByText(languages.fr.account.errorDeleteMessage)).toBeNull();
  });

  it("enregistre quand un champ a vraiment changé, après un enregistrement sans changement", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(saveButton());
    await user.type(screen.getByPlaceholderText(languages.fr.account.placeholderName), "x");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledTimes(1);
  });

  it("affiche le toast de succès après l'enregistrement", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(dict.successToast, expect.anything()));
  });

  it("n'appelle pas l'API quand le formulaire est invalide", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "ab");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).not.toHaveBeenCalled();
  });

  it("affiche « Enregistrement… » et bloque le bouton pendant l'appel", async () => {
    let resolve!: () => void;
    mockAuth.updateUserProfile = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    expect(screen.getByRole("button", { name: dict.saving })).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: dict.save })).toBeEnabled());
  });

  it("ignore un second clic tant que l'enregistrement est en cours", async () => {
    let resolve!: () => void;
    mockAuth.updateUserProfile = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it("n'affiche pas de toast de succès et réactive le bouton quand l'API échoue", async () => {
    mockAuth.updateUserProfile = vi.fn().mockRejectedValue(new Error("Email déjà utilisé"));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    await waitFor(() => expect(screen.getByRole("button", { name: dict.save })).toBeEnabled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    mockAuth.updateUserProfile = vi.fn().mockRejectedValue(new Error("Email déjà utilisé"));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Email déjà utilisé");
  });

  it("affiche un message générique quand l'erreur n'a pas de message exploitable", async () => {
    mockAuth.updateUserProfile = vi.fn().mockRejectedValue("échec");
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(dict.errorDeleteMessage);
  });

  it("efface l'erreur de l'API au nouvel enregistrement", async () => {
    mockAuth.updateUserProfile = vi.fn()
      .mockRejectedValueOnce(new Error("Email déjà utilisé"))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(saveButton());
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("n'affiche aucune alerte quand l'enregistrement réussit", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.type(nameInput(), "x"); // un changement réel est nécessaire pour enregistrer
    await user.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AccountPage – liaison Spotify", () => {
  it("propose de lier Spotify quand le compte n'est pas lié", () => {
    render(<AccountPage />);
    expect(screen.getByText(dict.notsynchronized)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dict.linkSpotify })).toBeInTheDocument();
    expect(screen.queryByText(dict.synchronized)).not.toBeInTheDocument();
  });

  it("lance la connexion Spotify au clic sur « Lier mon compte »", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByRole("button", { name: dict.linkSpotify }));
    expect(mockAuth.loginSpotify).toHaveBeenCalledTimes(1);
  });

  it("affiche l'email Spotify et l'état synchronisé quand le compte est lié", () => {
    mockAuth.user = withSpotify("yvan@spotify.com");
    render(<AccountPage />);
    expect(screen.getByText(dict.synchronized)).toBeInTheDocument();
    expect(screen.getByText("yvan@spotify.com")).toBeInTheDocument();
  });

  it("ne propose plus de lier Spotify quand le compte est lié", () => {
    mockAuth.user = withSpotify();
    render(<AccountPage />);
    expect(screen.queryByRole("button", { name: dict.linkSpotify })).not.toBeInTheDocument();
    expect(screen.queryByText(dict.notsynchronized)).not.toBeInTheDocument();
  });

  it("ne tient compte que du fournisseur Spotify (Apple Music lié ne suffit pas)", () => {
    mockAuth.user = makeUser({
      providers: { ...makeUser().providers, APPLE_MUSIC: { has: true, email: "a@apple.com" } },
    });
    render(<AccountPage />);
    expect(screen.getByText(dict.notsynchronized)).toBeInTheDocument();
  });
});

describe("AccountPage – nettoyage des données", () => {
  it("demande une confirmation avec le bon message", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    expect(prompt).toHaveBeenCalledWith(dict.confirmClear);
  });

  it("nettoie les données quand le mot de confirmation est correct", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.clearValidation);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    await waitFor(() => expect(mockAuth.clearAccount).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith(dict.successToastClear, expect.anything());
  });

  it.each([["confirmer"], ["oui"], [""], [null]])("ne fait rien quand la réponse est %j", async (answer) => {
    vi.spyOn(window, "prompt").mockReturnValue(answer as string | null);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    expect(mockAuth.clearAccount).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("n'accepte pas le mot de confirmation de la suppression du compte", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.deleteValidation);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    expect(mockAuth.clearAccount).not.toHaveBeenCalled();
  });

  it("affiche une erreur quand le nettoyage échoue", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.clearValidation);
    mockAuth.clearAccount = vi.fn().mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(dict.errorDeleteMessage));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("ne supprime pas le compte en nettoyant les données", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.clearValidation);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.cleardata));
    await waitFor(() => expect(mockAuth.clearAccount).toHaveBeenCalled());
    expect(mockAuth.deleteAccount).not.toHaveBeenCalled();
  });
});

describe("AccountPage – suppression du compte", () => {
  it("demande une confirmation avec le bon message", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.deleteaccount));
    expect(prompt).toHaveBeenCalledWith(dict.confirmDelete);
  });

  it("supprime le compte quand le mot de confirmation est correct", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.deleteValidation);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.deleteaccount));
    await waitFor(() => expect(mockAuth.deleteAccount).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith(dict.successDeleteToast, expect.anything());
  });

  it.each([["supprimer"], ["non"], [""], [null]])("ne fait rien quand la réponse est %j", async (answer) => {
    vi.spyOn(window, "prompt").mockReturnValue(answer as string | null);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.deleteaccount));
    expect(mockAuth.deleteAccount).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("n'accepte pas le mot de confirmation du nettoyage des données", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.clearValidation);
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.deleteaccount));
    expect(mockAuth.deleteAccount).not.toHaveBeenCalled();
  });

  it("affiche une erreur quand la suppression échoue", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(dict.deleteValidation);
    mockAuth.deleteAccount = vi.fn().mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<AccountPage />);
    await user.click(screen.getByText(dict.deleteaccount));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(dict.errorDeleteMessage));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("AccountPage – erreurs toujours cohérentes avec les valeurs saisies", () => {
  const isBlocked = () => (saveButton() as HTMLButtonElement).disabled;

  it("une erreur de nom disparaît quand le compte est rafraîchi et que le nom revient à la valeur enregistrée", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AccountPage />);
    await typeInto(user, nameInput(), "ab");
    expect(screen.getByText(dict.errorName1)).toBeInTheDocument();
    expect(isBlocked()).toBe(true);
    // refreshUser renvoie un nouvel objet : le champ reprend le nom enregistré
    mockAuth.user = makeUser({ user_name: "Yvan2" });
    rerender(<AccountPage />);
    expect(nameInput()).toHaveValue("Yvan2");
    expect(screen.queryByText(dict.errorName1)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("pas d'erreur de nom tant que le nom n'a pas été modifié", () => {
    render(<AccountPage />);
    expect(screen.queryByText(dict.errorName1)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("erreur de nom trop court puis trop long, puis valide : le message suit la valeur", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, nameInput(), "ab");
    expect(screen.getByText(dict.errorName1)).toBeInTheDocument();
    await typeInto(user, nameInput(), "a".repeat(21));
    expect(screen.queryByText(dict.errorName1)).not.toBeInTheDocument();
    expect(screen.getByText(dict.errorName2)).toBeInTheDocument();
    await typeInto(user, nameInput(), "Valide");
    expect(screen.queryByText(dict.errorName2)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("la confirmation en désaccord bloque, puis s'efface dès que le mot de passe est corrigé pour correspondre", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, pwInput(), "motdepasse1");
    await typeInto(user, confirmInput(), "motdepasse2");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    expect(isBlocked()).toBe(true);
    await typeInto(user, pwInput(), "motdepasse2");
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("la confirmation saisie avant le mot de passe est comparée à sa valeur actuelle", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, confirmInput(), "motdepasse1");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    await typeInto(user, pwInput(), "motdepasse1");
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("effacer le mot de passe alors que la confirmation est remplie signale le désaccord, effacer les deux le retire", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, pwInput(), "motdepasse1");
    await typeInto(user, confirmInput(), "motdepasse1");
    expect(isBlocked()).toBe(false);
    await typeInto(user, pwInput(), "");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    expect(isBlocked()).toBe(true);
    await typeInto(user, confirmInput(), "");
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("une erreur de mot de passe trop court et un désaccord de confirmation s'affichent chacun selon leur valeur", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, pwInput(), "court");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    await typeInto(user, confirmInput(), "court");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument();
    await typeInto(user, pwInput(), "assezlong");
    await typeInto(user, confirmInput(), "assezlong");
    expect(screen.queryByText(dict.errorPw1)).not.toBeInTheDocument();
    expect(isBlocked()).toBe(false);
  });

  it("modifier le nom n'efface pas une erreur de mot de passe déjà affichée (états indépendants)", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, pwInput(), "court");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    await typeInto(user, nameInput(), "Autre");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    expect(isBlocked()).toBe(true);
  });

  it("n'enregistre pas tant qu'une erreur existe, puis enregistre une fois les champs cohérents", async () => {
    const user = userEvent.setup();
    render(<AccountPage />);
    await typeInto(user, pwInput(), "motdepasse1");
    await typeInto(user, confirmInput(), "different");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).not.toHaveBeenCalled();
    await typeInto(user, confirmInput(), "motdepasse1");
    await user.click(saveButton());
    expect(mockAuth.updateUserProfile).toHaveBeenCalledWith({ password: "motdepasse1" });
  });
});
