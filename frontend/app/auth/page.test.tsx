import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import { ApiError } from "../services/api";
import AuthPage from "./page";

const dict = languages.fr.auth;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  auth: {} as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../context/authContext", () => ({ useAuth: () => h.auth }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
// La redirection des utilisateurs déjà connectés est testée ailleurs : ici on rend directement le contenu
vi.mock("../components/auth/PublicRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh }),
  useSearchParams: () => h.searchParams.current,
}));
vi.mock("react-hot-toast", () => ({ default: h.toast }));

// --- Helpers ---------------------------------------------------------------

type User = ReturnType<typeof userEvent.setup>;

const loginEmail = () => screen.getAllByPlaceholderText(dict.templateemail)[0] as HTMLInputElement;
const loginPassword = () => screen.getByPlaceholderText("••••••••") as HTMLInputElement;
const regUsername = () => screen.getByPlaceholderText("MusicFan_01") as HTMLInputElement;
const regEmail = () => screen.getAllByPlaceholderText(dict.templateemail)[1] as HTMLInputElement;
const regPassword = () => screen.getAllByPlaceholderText("••••")[0] as HTMLInputElement;
const regConfirm = () => screen.getAllByPlaceholderText("••••")[1] as HTMLInputElement;
const connectButton = () => screen.getByRole("button", { name: dict.connect });
const createButton = () => screen.getByRole("button", { name: dict.create });
const spotifyButton = () => screen.getByRole("button", { name: new RegExp(dict.connectwithspotify) });

const fillLogin = async (user: User, email = "yvan@example.com", password = "motdepasse") => {
  if (email) await user.type(loginEmail(), email);
  if (password) await user.type(loginPassword(), password);
};
const fillRegister = async (user: User, o: Partial<Record<"username" | "email" | "password" | "confirm", string>> = {}) => {
  const v = { username: "Yvan", email: "yvan@example.com", password: "motdepasse", confirm: "motdepasse", ...o };
  if (v.username) await user.type(regUsername(), v.username);
  if (v.email) await user.type(regEmail(), v.email);
  if (v.password) await user.type(regPassword(), v.password);
  if (v.confirm) await user.type(regConfirm(), v.confirm);
};

const apiError = (status: number, message = "API_ERROR") => Object.assign(new Error(message), { status });
const deferred = <T = void,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.searchParams.current = new URLSearchParams();
  Object.assign(h.auth, {
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    loginSpotify: vi.fn(),
  });
});

// --- Tests -----------------------------------------------------------------

describe("AuthPage – rendu", () => {
  it("affiche les deux colonnes : connexion et inscription", () => {
    render(<AuthPage />);
    expect(screen.getByText(dict.connecttitle)).toBeInTheDocument();
    expect(screen.getByText(dict.comeback)).toBeInTheDocument();
    expect(screen.getByText(dict.righttitle)).toBeInTheDocument();
    expect(screen.getByText(dict.rightsubtitle)).toBeInTheDocument();
  });

  it("affiche le bouton Spotify, le séparateur et la note légale", () => {
    render(<AuthPage />);
    expect(spotifyButton()).toBeInTheDocument();
    expect(screen.getByText(dict.ou)).toBeInTheDocument();
    expect(screen.getByText(dict.littleNote)).toBeInTheDocument();
  });

  it("affiche les 2 champs de connexion et les 4 champs d'inscription, tous vides", () => {
    render(<AuthPage />);
    for (const input of [loginEmail(), loginPassword(), regUsername(), regEmail(), regPassword(), regConfirm()]) {
      expect(input).toHaveValue("");
    }
  });

  it("utilise les bons types de champs (email, mot de passe masqué)", () => {
    render(<AuthPage />);
    expect(loginEmail()).toHaveAttribute("type", "email");
    expect(regEmail()).toHaveAttribute("type", "email");
    expect(loginPassword()).toHaveAttribute("type", "password");
    expect(regPassword()).toHaveAttribute("type", "password");
    expect(regConfirm()).toHaveAttribute("type", "password");
    expect(regUsername()).toHaveAttribute("type", "text");
  });

  it("affiche les boutons « Se connecter » et « Créer mon compte »", () => {
    render(<AuthPage />);
    expect(connectButton()).toBeEnabled();
    expect(createButton()).toBeEnabled();
  });

  it("n'affiche aucune erreur au départ", () => {
    const { container } = render(<AuthPage />);
    expect(container.querySelector(".animate-shake")).not.toBeInTheDocument();
  });

  it("garde les deux formulaires indépendants", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(loginEmail(), "connexion@example.com");
    expect(loginEmail()).toHaveValue("connexion@example.com");
    expect(regEmail()).toHaveValue("");
  });
});

describe("AuthPage – connexion avec Spotify", () => {
  it("lance la connexion Spotify au clic", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(spotifyButton());
    expect(h.auth.loginSpotify).toHaveBeenCalledTimes(1);
  });

  it("ne soumet aucun formulaire en cliquant sur Spotify", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(spotifyButton());
    expect(h.auth.login).not.toHaveBeenCalled();
    expect(h.auth.register).not.toHaveBeenCalled();
  });
});

describe("AuthPage – connexion par email", () => {
  it("connecte l'utilisateur avec l'email et le mot de passe saisis", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user, "yvan@example.com", "motdepasse");
    await user.click(connectButton());
    expect(h.auth.login).toHaveBeenCalledWith("yvan@example.com", "motdepasse");
    expect(h.auth.login).toHaveBeenCalledTimes(1);
  });

  it("redirige vers l'accueil et rafraîchit la page après la connexion", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/"));
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("se soumet aussi avec la touche Entrée", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user, "yvan@example.com", "motdepasse");
    await user.type(loginPassword(), "{enter}");
    expect(h.auth.login).toHaveBeenCalledWith("yvan@example.com", "motdepasse");
  });

  it("n'inscrit personne en se connectant", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    await waitFor(() => expect(h.push).toHaveBeenCalled());
    expect(h.auth.register).not.toHaveBeenCalled();
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it("garde le formulaire affiché (même champ, focus conservé) pendant la connexion", async () => {
    const d = deferred();
    h.auth.login = vi.fn(() => d.promise);
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    const password = screen.getByPlaceholderText("••••••••");
    password.focus();
    await user.click(connectButton());
    expect(screen.getByPlaceholderText("••••••••")).toBe(password);
    expect(document.querySelectorAll(".animate-pulse").length).toBe(0);
    expect(screen.getByRole("button", { name: dict.connecting })).toBeDisabled();

    d.reject(apiError(401, "Email ou mot de passe incorrect"));
    expect(await screen.findByText("Email ou mot de passe incorrect")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBe(password);
  });

  it("n'envoie pas la connexion deux fois quand Entrée est pressé pendant le chargement", async () => {
    const d = deferred();
    h.auth.login = vi.fn(() => d.promise);
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.type(screen.getByPlaceholderText("••••••••"), "{Enter}");
    await user.type(screen.getByPlaceholderText("••••••••"), "{Enter}");
    expect(h.auth.login).toHaveBeenCalledTimes(1);
    d.reject(apiError(401, "x"));
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    h.auth.login = vi.fn().mockRejectedValue(apiError(401, "Email ou mot de passe incorrect"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    expect(await screen.findByText("Email ou mot de passe incorrect")).toBeInTheDocument();
  });

  it("affiche un message générique quand l'erreur n'a pas de message", async () => {
    h.auth.login = vi.fn().mockRejectedValue(new Error(""));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    expect(await screen.findByText(dict.errorOccured)).toBeInTheDocument();
  });

  it("ne redirige pas quand la connexion échoue", async () => {
    h.auth.login = vi.fn().mockRejectedValue(apiError(401, "Refusé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    await screen.findByText("Refusé");
    expect(h.push).not.toHaveBeenCalled();
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it("conserve les valeurs saisies après un échec", async () => {
    h.auth.login = vi.fn().mockRejectedValue(apiError(401, "Refusé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user, "yvan@example.com", "motdepasse");
    await user.click(connectButton());
    await screen.findByText("Refusé");
    expect(loginEmail()).toHaveValue("yvan@example.com");
    expect(loginPassword()).toHaveValue("motdepasse");
  });

  it("efface l'erreur au nouvel essai", async () => {
    h.auth.login = vi.fn().mockRejectedValueOnce(apiError(401, "Refusé")).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    await screen.findByText("Refusé");
    await user.click(connectButton());
    await waitFor(() => expect(screen.queryByText("Refusé")).not.toBeInTheDocument());
    expect(h.push).toHaveBeenCalledWith("/");
  });

  it("n'affiche pas l'erreur de connexion dans le formulaire d'inscription", async () => {
    h.auth.login = vi.fn().mockRejectedValue(apiError(401, "Refusé"));
    const user = userEvent.setup();
    const { container } = render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    await screen.findByText("Refusé");
    expect(container.querySelectorAll(".animate-shake")).toHaveLength(1);
  });
});

describe("AuthPage – inscription", () => {
  it("crée le compte avec pseudo, email et mot de passe (sans la confirmation)", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { username: "Yvan", email: "yvan@example.com", password: "motdepasse", confirm: "motdepasse" });
    await user.click(createButton());
    expect(h.auth.register).toHaveBeenCalledWith("Yvan", "yvan@example.com", "motdepasse");
    expect(h.auth.register).toHaveBeenCalledTimes(1);
  });

  it("affiche le toast de bienvenue après la création", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith(dict.welcome, expect.anything()));
  });

  it("ne redirige pas lui-même après l'inscription (c'est la route publique qui le fait)", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
    expect(h.push).not.toHaveBeenCalled();
  });

  it("refuse des mots de passe différents sans appeler l'API", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { password: "motdepasse", confirm: "autrechose" });
    await user.click(createButton());
    // l'erreur est signalée sous le champ ET dans le message du formulaire
    expect(screen.getAllByText(dict.errorPw3).length).toBeGreaterThanOrEqual(1);
    expect(h.auth.register).not.toHaveBeenCalled();
  });

  it("n'affiche pas de squelette quand les mots de passe diffèrent", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { confirm: "autrechose" });
    await user.click(createButton());
    expect(regUsername()).toHaveValue("Yvan");
  });

  it("efface l'erreur de confirmation quand le nouvel essai est valide", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { confirm: "autrechose" });
    await user.click(createButton());
    expect(screen.getAllByText(dict.errorPw3).length).toBeGreaterThanOrEqual(1);
    await user.clear(regConfirm());
    await user.type(regConfirm(), "motdepasse");
    await user.click(createButton());
    await waitFor(() => expect(screen.queryByText(dict.errorPw3)).not.toBeInTheDocument());
    expect(h.auth.register).toHaveBeenCalledTimes(1);
  });

  it("garde le formulaire affiché pendant la création, puis affiche l'erreur", async () => {
    const d = deferred();
    h.auth.register = vi.fn(() => d.promise);
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    const username = screen.getByPlaceholderText("MusicFan_01");
    await user.click(createButton());
    expect(screen.getByPlaceholderText("MusicFan_01")).toBe(username);
    expect(document.querySelectorAll(".animate-pulse").length).toBe(0);

    d.reject(apiError(500));
    await waitFor(() => expect(screen.getByPlaceholderText("MusicFan_01")).toBe(username));
  });

  it("affiche l'erreur de validation du serveur sur un 422", async () => {
    h.auth.register = vi.fn().mockRejectedValue(apiError(422));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText(dict.errorRegisterInvalid)).toBeInTheDocument();
  });

  it("affiche le message de l'API sur un 400 (ex : email déjà utilisé)", async () => {
    h.auth.register = vi.fn().mockRejectedValue(apiError(400, "Cet email est déjà utilisé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText("Cet email est déjà utilisé")).toBeInTheDocument();
  });

  it.each([[500], [503], [401], [0]])("affiche l'erreur générique sur un statut %i", async (status) => {
    h.auth.register = vi.fn().mockRejectedValue(apiError(status));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText(dict.errorPw2)).toBeInTheDocument();
  });

  it("affiche l'erreur générique quand l'erreur n'a pas de statut", async () => {
    h.auth.register = vi.fn().mockRejectedValue(new Error("réseau"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText(dict.errorPw2)).toBeInTheDocument();
  });

  it("n'affiche pas le toast de bienvenue quand l'inscription échoue", async () => {
    h.auth.register = vi.fn().mockRejectedValue(apiError(400, "Refusé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await screen.findByText("Refusé");
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it("conserve les valeurs saisies après un échec", async () => {
    h.auth.register = vi.fn().mockRejectedValue(apiError(400, "Refusé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { username: "Yvan", email: "yvan@example.com", password: "motdepasse", confirm: "motdepasse" });
    await user.click(createButton());
    await screen.findByText("Refusé");
    expect(regUsername()).toHaveValue("Yvan");
    expect(regEmail()).toHaveValue("yvan@example.com");
    expect(regPassword()).toHaveValue("motdepasse");
    expect(regConfirm()).toHaveValue("motdepasse");
  });

  it("efface l'erreur au nouvel essai", async () => {
    h.auth.register = vi.fn().mockRejectedValueOnce(apiError(400, "Refusé")).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await screen.findByText("Refusé");
    await user.click(createButton());
    await waitFor(() => expect(screen.queryByText("Refusé")).not.toBeInTheDocument());
    expect(h.toast.success).toHaveBeenCalledTimes(1);
  });

  it("ne connecte pas l'utilisateur en créant un compte", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
    expect(h.auth.login).not.toHaveBeenCalled();
  });
});

describe("AuthPage – erreurs Spotify dans l'URL", () => {
  const setError = (code?: string) => { h.searchParams.current = new URLSearchParams(code ? `error=${code}` : ""); };

  it.each([
    ["spotify_cancelled", dict.spotifyError1],
    ["spotify_token_error", dict.spotifyError2],
    ["spotify_profile_error", dict.spotifyError3],
    ["missing_code", dict.spotifyError4],
    ["access_denied", dict.spotifyError1],
  ])("traduit le code « %s » en message lisible", (code, message) => {
    setError(code);
    render(<AuthPage />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("affiche le code brut pour une erreur inconnue", () => {
    setError("quelque_chose");
    render(<AuthPage />);
    expect(screen.getByText(`${dict.spotifyErrorTemplate} : quelque_chose`)).toBeInTheDocument();
  });

  it("n'affiche aucune erreur sans paramètre dans l'URL", () => {
    setError();
    const { container } = render(<AuthPage />);
    expect(container.querySelector(".animate-shake")).not.toBeInTheDocument();
  });

  it("nettoie l'URL sans recharger la page", () => {
    setError("missing_code");
    const replace = vi.spyOn(window.history, "replaceState");
    render(<AuthPage />);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith({}, document.title, window.location.pathname);
  });

  it("ne touche pas à l'URL quand il n'y a pas d'erreur", () => {
    setError();
    const replace = vi.spyOn(window.history, "replaceState");
    render(<AuthPage />);
    expect(replace).not.toHaveBeenCalled();
  });

  it("affiche l'erreur Spotify dans la colonne de connexion uniquement", () => {
    setError("spotify_token_error");
    const { container } = render(<AuthPage />);
    expect(container.querySelectorAll(".animate-shake")).toHaveLength(1);
  });

  it("remplace l'erreur de l'URL par celle d'une tentative de connexion ratée", async () => {
    setError("missing_code");
    h.auth.login = vi.fn().mockRejectedValue(apiError(401, "Refusé"));
    const user = userEvent.setup();
    render(<AuthPage />);
    expect(screen.getByText(dict.spotifyError4)).toBeInTheDocument();
    await fillLogin(user);
    await user.click(connectButton());
    expect(await screen.findByText("Refusé")).toBeInTheDocument();
    expect(screen.queryByText(dict.spotifyError4)).not.toBeInTheDocument();
  });
});

describe("AuthPage – avec de vraies ApiError (format des erreurs FastAPI)", () => {
  it("affiche le message du backend à la connexion, et non « API_ERROR »", async () => {
    h.auth.login = vi.fn().mockRejectedValue(new ApiError(401, { detail: "Email ou mot de passe incorrect" }));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillLogin(user);
    await user.click(connectButton());
    expect(await screen.findByText("Email ou mot de passe incorrect")).toBeInTheDocument();
    expect(screen.queryByText("API_ERROR")).not.toBeInTheDocument();
  });

  it("affiche le message du backend sur un 400 à l'inscription", async () => {
    h.auth.register = vi.fn().mockRejectedValue(new ApiError(400, { detail: "Cet email est déjà utilisé" }));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText("Cet email est déjà utilisé")).toBeInTheDocument();
  });

  it("affiche l'erreur de validation sur un 422 (détail de validation sous forme de liste)", async () => {
    h.auth.register = vi.fn().mockRejectedValue(new ApiError(422, { detail: [{ loc: ["body", "password"], msg: "trop court" }] }));
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    expect(await screen.findByText(dict.errorRegisterInvalid)).toBeInTheDocument();
  });
});

describe("AuthPage – validation de l'inscription côté client", () => {
  const field = (v: string) => screen.queryByText(v);

  it("n'affiche aucune erreur tant que les champs sont vides", () => {
    render(<AuthPage />);
    for (const msg of [dict.errorUsernameMin, dict.errorUsernameMax, dict.errorPw1, dict.errorPwMax, dict.errorPw3, dict.errorRequired])
      expect(field(msg)).not.toBeInTheDocument();
  });

  it("signale un nom d'utilisateur trop court, puis trop long, puis valide", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(regUsername(), "ab");
    expect(screen.getByText(dict.errorUsernameMin)).toBeInTheDocument();
    expect(regUsername()).toHaveAttribute("aria-invalid", "true");
    await user.clear(regUsername());
    await user.type(regUsername(), "a".repeat(21));
    expect(field(dict.errorUsernameMin)).not.toBeInTheDocument();
    expect(screen.getByText(dict.errorUsernameMax)).toBeInTheDocument();
    await user.clear(regUsername());
    await user.type(regUsername(), "a".repeat(20));
    expect(field(dict.errorUsernameMax)).not.toBeInTheDocument();
    expect(regUsername()).toHaveAttribute("aria-invalid", "false");
  });

  it("des espaces autour du pseudo ne comptent pas dans la longueur", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(regUsername(), "  ab  ");
    expect(screen.getByText(dict.errorUsernameMin)).toBeInTheDocument();
  });

  it("signale un mot de passe trop court (moins de 8) et accepte exactement 8", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(regPassword(), "1234567");
    expect(screen.getByText(dict.errorPw1)).toBeInTheDocument();
    await user.type(regPassword(), "8");
    expect(field(dict.errorPw1)).not.toBeInTheDocument();
  });

  it("signale un mot de passe de plus de 128 caractères, accepte exactement 128", async () => {
    render(<AuthPage />);
    fireEvent.change(regPassword(), { target: { value: "a".repeat(129) } });
    expect(screen.getByText(dict.errorPwMax)).toBeInTheDocument();
    fireEvent.change(regPassword(), { target: { value: "a".repeat(128) } });
    expect(field(dict.errorPwMax)).not.toBeInTheDocument();
  });

  it("signale une confirmation différente dès la saisie, et la retire quand elle correspond", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(regPassword(), "motdepasse");
    await user.type(regConfirm(), "motdepass");
    expect(screen.getByText(dict.errorPw3)).toBeInTheDocument();
    await user.type(regConfirm(), "e");
    expect(field(dict.errorPw3)).not.toBeInTheDocument();
  });

  it("n'envoie rien et le dit quand un champ est vide", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { username: "" });
    await user.click(createButton());
    expect(screen.getByText(dict.errorRequired)).toBeInTheDocument();
    expect(h.auth.register).not.toHaveBeenCalled();
  });

  it("n'envoie rien avec un pseudo trop court et affiche l'erreur dans le formulaire", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { username: "ab" });
    await user.click(createButton());
    expect(screen.getAllByText(dict.errorUsernameMin).length).toBeGreaterThanOrEqual(2);
    expect(h.auth.register).not.toHaveBeenCalled();
  });

  it("n'envoie rien avec un mot de passe trop court", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user, { password: "court", confirm: "court" });
    await user.click(createButton());
    expect(h.auth.register).not.toHaveBeenCalled();
  });

  it("envoie l'inscription quand tout est valide", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await fillRegister(user);
    await user.click(createButton());
    await waitFor(() => expect(h.auth.register).toHaveBeenCalledWith("Yvan", "yvan@example.com", "motdepasse"));
  });

  it("l'erreur d'un champ est reliée à son champ (aria-describedby)", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.type(regUsername(), "ab");
    expect(regUsername()).toHaveAccessibleDescription(dict.errorUsernameMin);
  });
});

describe("AuthPage – saisie automatique et libellés des champs", () => {
  it("indique les bons autoComplete pour la connexion", () => {
    render(<AuthPage />);
    expect(loginEmail()).toHaveAttribute("autocomplete", "username");
    expect(loginPassword()).toHaveAttribute("autocomplete", "current-password");
  });

  it("indique les bons autoComplete pour l'inscription (nouveau mot de passe)", () => {
    render(<AuthPage />);
    expect(regUsername()).toHaveAttribute("autocomplete", "username");
    expect(regEmail()).toHaveAttribute("autocomplete", "email");
    expect(regPassword()).toHaveAttribute("autocomplete", "new-password");
    expect(regConfirm()).toHaveAttribute("autocomplete", "new-password");
  });

  it("relie chaque champ à son libellé (accessibles par leur nom)", () => {
    render(<AuthPage />);
    expect(screen.getAllByLabelText(dict.emailtitle)).toHaveLength(2);
    expect(screen.getAllByLabelText(dict.pw)).toHaveLength(2);
    expect(screen.getByLabelText(dict.username)).toBeInTheDocument();
    expect(screen.getByLabelText(dict.confirm)).toBeInTheDocument();
  });

  it("les identifiants des champs de connexion et d'inscription sont tous distincts", () => {
    const { container } = render(<AuthPage />);
    const ids = [...container.querySelectorAll("input[id]")].map((i) => i.id);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
