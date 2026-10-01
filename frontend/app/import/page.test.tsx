import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import { API_ENDPOINTS } from "../constants/routes";
import { ApiError } from "../services/api";
import ImportPage, { ImportContent } from "./page";

const dict = languages.fr.importData;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({
  uploadSpotifyJson: vi.fn(),
  uploadAppleJson: vi.fn(),
  loading: false,
  user: { id: 7 } as { id: number } | null,
}));

vi.mock("../hooks/useApiUploadData", () => ({
  useApiUploadData: () => ({
    uploadSpotifyJson: h.uploadSpotifyJson,
    uploadAppleJson: h.uploadAppleJson,
    loading: h.loading,
  }),
}));
vi.mock("../context/authContext", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("../components/auth/ProtectedRoute", () => ({
  default: ({ children, skeleton }: { children: React.ReactNode; skeleton: React.ReactNode }) => (
    <div data-testid="protected">{h.user ? children : skeleton}</div>
  ),
}));

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 0;
  onopen: (() => void | Promise<void>) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn(() => { this.readyState = 3; });
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = FakeWebSocket.OPEN;
    return this.onopen?.();
  }
}
const lastWs = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

// L'ouverture du WebSocket lance l'envoi : on ne l'attend pas (il peut ne jamais se terminer)
const openWs = () => act(async () => { void lastWs().open(); });

const jsonFile = (name = "Streaming_History_Audio_1.json") => new File(["[]"], name, { type: "application/json" });

const HEADER = "Track Identifier,Track Description,Date Played,Hours,Play Duration Milliseconds,Play Count";
const csvFile = (rows: string[], name = "apple.csv") => new File([[HEADER, ...rows].join("\n")], name, { type: "text/csv" });

const getInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const submitBtn = () => screen.getByRole("button", { name: new RegExp(`${dict.submitBtn}|${dict.loadingBtn}`) });

const selectFiles = async (files: File[]) => {
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(getInput(), files);
  return user;
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  h.uploadSpotifyJson.mockReset();
  h.uploadAppleJson.mockReset();
  h.loading = false;
  h.user = { id: 7 };
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// --- Tests -------------------------------------------------------------------

describe("ImportPage (protection)", () => {
  it("affiche le contenu quand l'utilisateur est connecté", () => {
    render(<ImportPage />);
    expect(screen.getByText(dict.title)).toBeInTheDocument();
  });

  it("affiche le squelette quand l'utilisateur n'est pas connecté", () => {
    h.user = null;
    render(<ImportPage />);
    expect(screen.queryByText(dict.title)).toBeNull();
  });
});

describe("ImportContent (affichage)", () => {
  it("affiche le formulaire, l'aide et les 4 étapes", () => {
    render(<ImportContent />);
    expect(screen.getByText(dict.title)).toBeInTheDocument();
    expect(screen.getByText(dict.helpTitle)).toBeInTheDocument();
    for (const s of [dict.step1, dict.step2, dict.step3, dict.step4]) {
      expect(screen.getByText(s, { exact: false })).toBeInTheDocument();
    }
    expect(screen.getByText(dict.dropzoneIdle)).toBeInTheDocument();
    expect(screen.getByText(dict.footerHint)).toBeInTheDocument();
  });

  it("le champ fichier a un nom accessible traduit et reste focalisable au clavier", async () => {
    render(<ImportContent />);
    const input = screen.getByLabelText(dict.fileInputLabel);
    expect(input).toBe(getInput());
    expect(input.className).not.toContain("hidden");
    await userEvent.setup().tab();
    expect(input).toHaveFocus();
    expect(input.className).toContain("peer");
  });

  it("le lien externe s'ouvre dans un nouvel onglet sans donner accès à window.opener", () => {
    render(<ImportContent />);
    const link = screen.getByRole("link", { name: /spotify\.com\/account\/privacy/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel") ?? "").toMatch(/noopener/);
  });

  it("le bouton d'envoi est désactivé sans fichier", () => {
    render(<ImportContent />);
    expect(submitBtn()).toBeDisabled();
  });

  it("les messages d'erreur sont stylés avec de vraies classes (pas de ${...} littéral)", async () => {
    render(<ImportContent />);
    await selectFiles([new File(["x"], "a.txt")]);
    const alert = screen.getByText(dict.errorJsonOnly);
    expect(alert.className).not.toContain("${");
  });
});

describe("ImportContent (sélection de fichiers)", () => {
  it("affiche les fichiers choisis et active le bouton", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("a.json"), jsonFile("b.json")]);
    expect(screen.getByText(dict.dropzoneActive(2))).toBeInTheDocument();
    expect(screen.getByText("a.json")).toBeInTheDocument();
    expect(screen.getByText("b.json")).toBeInTheDocument();
    expect(submitBtn()).toBeEnabled();
  });

  it("accepte les fichiers .csv", async () => {
    render(<ImportContent />);
    await selectFiles([csvFile([])]);
    expect(screen.getByText("apple.csv")).toBeInTheDocument();
  });

  it("accepte les extensions en majuscules (.JSON, .CSV)", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("EXPORT.JSON")]);
    expect(screen.getByText("EXPORT.JSON")).toBeInTheDocument();
    expect(screen.queryByText(dict.errorJsonOnly)).toBeNull();
  });

  it("refuse une sélection contenant un fichier d'un autre type", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("a.json"), new File(["x"], "notes.txt")]);
    expect(screen.getByText(dict.errorJsonOnly)).toBeInTheDocument();
    expect(screen.queryByText("a.json")).toBeNull();
    expect(submitBtn()).toBeDisabled();
  });

  it("vide le champ fichier après un refus, pour que re-choisir le même fichier redéclenche la sélection", async () => {
    render(<ImportContent />);
    await selectFiles([new File(["x"], "notes.txt")]);
    expect(screen.getByText(dict.errorJsonOnly)).toBeInTheDocument();
    expect(getInput().value).toBe("");
  });

  it("vide aussi le champ après un mélange .json/.csv refusé", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("a.json"), csvFile([], "b.csv")]);
    expect(getInput().value).toBe("");
  });

  it("vide le champ après une sélection valide et garde bien les fichiers choisis", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("a.json"), jsonFile("b.json")]);
    expect(getInput().value).toBe("");
    expect(screen.getByText("a.json")).toBeInTheDocument();
    expect(screen.getByText("b.json")).toBeInTheDocument();
  });

  it("re-choisir le même fichier invalide affiche de nouveau l'erreur après qu'elle a été effacée", async () => {
    render(<ImportContent />);
    const user = await selectFiles([new File(["x"], "notes.txt")]);
    await user.upload(getInput(), jsonFile());
    expect(screen.queryByText(dict.errorJsonOnly)).toBeNull();
    await user.upload(getInput(), new File(["x"], "notes.txt"));
    expect(screen.getByText(dict.errorJsonOnly)).toBeInTheDocument();
  });

  it("efface l'erreur quand une sélection valide suit une sélection invalide", async () => {
    render(<ImportContent />);
    const user = await selectFiles([new File(["x"], "notes.txt")]);
    expect(screen.getByText(dict.errorJsonOnly)).toBeInTheDocument();
    await user.upload(getInput(), jsonFile());
    expect(screen.queryByText(dict.errorJsonOnly)).toBeNull();
  });

  it("refuse un mélange de .json et de .csv", async () => {
    render(<ImportContent />);
    await selectFiles([jsonFile("a.json"), csvFile([], "b.csv")]);
    expect(screen.getByText(dict.errorJsonOnly)).toBeInTheDocument();
    expect(submitBtn()).toBeDisabled();
  });
});

describe("ImportContent (import Spotify)", () => {
  const submit = async () => {
    const user = await selectFiles([jsonFile()]);
    await user.click(submitBtn());
    return user;
  };

  it("ouvre le WebSocket de progression de l'utilisateur", async () => {
    render(<ImportContent />);
    await submit();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(lastWs().url).toBe(`${API_ENDPOINTS.WEBSOCKET_PROGRESS}/7`);
    expect(h.uploadSpotifyJson).not.toHaveBeenCalled();
  });

  it("envoie les fichiers une fois le WebSocket ouvert et affiche le succès", async () => {
    h.uploadSpotifyJson.mockResolvedValue({ count: 1234 });
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.successImport(1234))).toBeInTheDocument());
    expect(h.uploadSpotifyJson).toHaveBeenCalledTimes(1);
    expect(h.uploadSpotifyJson.mock.calls[0][0]).toHaveLength(1);
    expect(screen.queryByText("Streaming_History_Audio_1.json")).toBeNull();
  });

  it("affiche le message du serveur quand il en fournit un", async () => {
    h.uploadSpotifyJson.mockResolvedValue({ message: "Import terminé" });
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText("Import terminé")).toBeInTheDocument());
  });

  it("utilise `added` puis 0 quand le serveur ne donne pas de total", async () => {
    h.uploadSpotifyJson.mockResolvedValue({ added: 5 });
    const { unmount } = render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.successImport(5))).toBeInTheDocument());
    unmount();

    h.uploadSpotifyJson.mockResolvedValue({});
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.successImport(0))).toBeInTheDocument());
  });

  it("met à jour la barre de progression avec les messages du WebSocket et le ferme à 100 %", async () => {
    let finish!: (v: unknown) => void;
    h.uploadSpotifyJson.mockReturnValue(new Promise((r) => { finish = r; }));
    const { rerender } = render(<ImportContent />);
    await submit();
    await openWs();
    h.loading = true;
    rerender(<ImportContent />);
    act(() => lastWs().onmessage!({ data: JSON.stringify({ percentage: 42 }) }));
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(lastWs().close).not.toHaveBeenCalled();
    act(() => lastWs().onmessage!({ data: JSON.stringify({ percentage: 100 }) }));
    expect(lastWs().close).toHaveBeenCalled();
    await act(async () => { finish({ count: 1 }); });
  });

  it("ignore un message de progression illisible sans planter", async () => {
    h.uploadSpotifyJson.mockReturnValue(new Promise(() => {}));
    render(<ImportContent />);
    await submit();
    await openWs();
    expect(() => act(() => lastWs().onmessage!({ data: "pas du json" }))).not.toThrow();
    expect(screen.getByText(dict.title)).toBeInTheDocument();
  });

  it("affiche le message de l'ApiError et ferme le WebSocket ouvert", async () => {
    h.uploadSpotifyJson.mockRejectedValue(new ApiError(400, "Fichier invalide"));
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText("Fichier invalide")).toBeInTheDocument());
    expect(lastWs().close).toHaveBeenCalled();
  });

  it("affiche l'erreur générique pour une erreur inattendue", async () => {
    h.uploadSpotifyJson.mockRejectedValue(new Error("réseau"));
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.errorGeneric)).toBeInTheDocument());
  });

  it("n'ouvre aucun WebSocket sans utilisateur connecté (pas d'URL .../undefined)", async () => {
    h.user = null;
    render(<ImportContent />);
    await submit();
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(screen.getByText(dict.errorSession)).toBeInTheDocument();
    expect(h.uploadSpotifyJson).not.toHaveBeenCalled();
  });

  it("affiche l'erreur de connexion quand le serveur ferme le WebSocket avant son ouverture (connexion refusée)", async () => {
    render(<ImportContent />);
    await submit();
    act(() => lastWs().onclose!());
    await waitFor(() => expect(screen.getByText(dict.errorWs)).toBeInTheDocument());
    expect(h.uploadSpotifyJson).not.toHaveBeenCalled();
  });

  it("une fermeture normale après l'ouverture n'est pas une erreur", async () => {
    h.uploadSpotifyJson.mockResolvedValue({ count: 2 });
    render(<ImportContent />);
    await submit();
    await openWs();
    act(() => lastWs().onclose!());
    await waitFor(() => expect(screen.getByText(dict.successImport(2))).toBeInTheDocument());
    expect(screen.queryByText(dict.errorWs)).toBeNull();
  });

  it("affiche l'erreur de WebSocket quand la connexion échoue", async () => {
    render(<ImportContent />);
    await submit();
    act(() => lastWs().onerror!());
    await waitFor(() => expect(screen.getByText(dict.errorWs)).toBeInTheDocument());
    expect(h.uploadSpotifyJson).not.toHaveBeenCalled();
  });

  it("garde les fichiers sélectionnés après une erreur pour pouvoir réessayer", async () => {
    h.uploadSpotifyJson.mockRejectedValue(new Error("x"));
    render(<ImportContent />);
    await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.errorGeneric)).toBeInTheDocument());
    expect(screen.getByText("Streaming_History_Audio_1.json")).toBeInTheDocument();
    expect(submitBtn()).toBeEnabled();
  });

  it("désactive le bouton et affiche le libellé de chargement pendant l'envoi", () => {
    h.loading = true;
    render(<ImportContent />);
    expect(screen.getByRole("button", { name: dict.loadingBtn })).toBeDisabled();
  });

  it("efface l'ancien message de succès à la nouvelle sélection", async () => {
    h.uploadSpotifyJson.mockResolvedValue({ count: 3 });
    render(<ImportContent />);
    const user = await submit();
    await openWs();
    await waitFor(() => expect(screen.getByText(dict.successImport(3))).toBeInTheDocument());
    await user.upload(getInput(), jsonFile("b.json"));
    expect(screen.queryByText(dict.successImport(3))).toBeNull();
  });
});

describe("ImportContent (import Apple CSV)", () => {
  const start = async (rows: string[]) => {
    const user = await selectFiles([csvFile(rows)]);
    await user.click(submitBtn());
    await openWs();
    return user;
  };

  it("transforme une ligne en autant d'écoutes que de lectures, réparties à la seconde", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 3 });
    render(<ImportContent />);
    await start(['"abc","Daft Punk - One More Time",20240131,14,720000,3']);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    expect(h.uploadAppleJson.mock.calls[0][0]).toEqual([
      { apple_track_id: "abc", song_name: "One More Time", artist_name: "Daft Punk", played_at: "2024-01-31T14:00:00.000Z", ms_played: 240000 },
      { apple_track_id: "abc", song_name: "One More Time", artist_name: "Daft Punk", played_at: "2024-01-31T14:00:01.000Z", ms_played: 240000 },
      { apple_track_id: "abc", song_name: "One More Time", artist_name: "Daft Punk", played_at: "2024-01-31T14:00:02.000Z", ms_played: 240000 },
    ]);
  });

  it("passe à la minute suivante après 60 écoutes dans la même heure", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 61 });
    render(<ImportContent />);
    await start(['"abc","A - B",20240131,9,3660000,61']);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    const plays = h.uploadAppleJson.mock.calls[0][0];
    expect(plays).toHaveLength(61);
    expect(plays[59].played_at).toBe("2024-01-31T09:00:59.000Z");
    expect(plays[60].played_at).toBe("2024-01-31T09:01:00.000Z");
  });

  it("ignore les lectures de 30 s ou moins et les lignes sans identifiant", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 1 });
    render(<ImportContent />);
    await start([
      '"short","A - Court",20240101,1,30000,1',
      '"","A - SansId",20240101,1,200000,1',
      '"ok","A - Long",20240101,1,200000,1',
    ]);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    const plays = h.uploadAppleJson.mock.calls[0][0];
    expect(plays.map((p: { apple_track_id: string }) => p.apple_track_id)).toEqual(["ok"]);
  });

  it("gère une description sans artiste et un titre contenant ' - '", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 2 });
    render(<ImportContent />);
    await start([
      '"1","Seul",20240101,1,200000,1',
      '"2","Artiste - Titre - Remix",20240101,1,200000,1',
    ]);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    const [a, b] = h.uploadAppleJson.mock.calls[0][0];
    // Pas de faux nom d'artiste envoyé au serveur : chaîne vide, le serveur enregistre le titre seul
    expect(a).toMatchObject({ artist_name: "", song_name: "Seul" });
    expect(JSON.stringify(a)).not.toContain("Unknown");
    expect(b).toMatchObject({ artist_name: "Artiste", song_name: "Titre - Remix" });
  });

  it("n'appelle pas le backend quand aucune ligne n'est valide", async () => {
    render(<ImportContent />);
    await start(['"short","A - Court",20240101,1,1000,1']);
    await waitFor(() => expect(lastWs().close).toHaveBeenCalled());
    expect(h.uploadAppleJson).not.toHaveBeenCalled();
  });

  it("ferme le WebSocket et affiche un message de succès avec le total envoyé", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 2 });
    render(<ImportContent />);
    await start(['"1","A - B",20240101,1,400000,2']);
    await waitFor(() => expect(lastWs().close).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(new RegExp(dict.appleSent(2).replace(/[.]/g, "\\.")))).toBeInTheDocument());
    expect(screen.queryByText("apple.csv")).toBeNull();
  });

  it("n'utilise pas la route d'import Spotify pour un CSV", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 1 });
    render(<ImportContent />);
    await start(['"1","A - B",20240101,1,200000,1']);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    expect(h.uploadSpotifyJson).not.toHaveBeenCalled();
  });

  it("débloque le formulaire et affiche l'erreur quand l'envoi d'un lot échoue", async () => {
    h.uploadAppleJson.mockRejectedValue(new ApiError(500, "Erreur serveur"));
    render(<ImportContent />);
    await start(['"1","A - B",20240101,1,200000,1']);
    await waitFor(() => expect(screen.getByText("Erreur serveur")).toBeInTheDocument());
    await waitFor(() => expect(submitBtn()).toBeEnabled());
  });

  it("envoie les écoutes par lots d'au plus 5000, sans en perdre", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 1 });
    render(<ImportContent />);
    // Deux lignes de 3600 écoutes (une par seconde dans l'heure) : 7200 écoutes au total
    const big = (id: string, hour: number) => `"${id}","A - B",20240101,${hour},${3600 * 40000},3600`;
    await start([big("1", 1), big("2", 2)]);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalledTimes(2));
    expect(h.uploadAppleJson.mock.calls.map((c) => c[0].length)).toEqual([5000, 2200]);
  });

  it("plafonne un Play Count aberrant à 3600 écoutes par ligne (pas de minute ≥ 60)", async () => {
    h.uploadAppleJson.mockResolvedValue({ added: 1 });
    render(<ImportContent />);
    await start([`"1","A - B",20240101,1,${100000 * 40000},100000`]);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    const plays = h.uploadAppleJson.mock.calls.flatMap((c) => c[0]);
    expect(plays).toHaveLength(3600);
    expect(plays.every((p: { played_at: string }) => /T01:[0-5]\d:[0-5]\d\.000Z$/.test(p.played_at))).toBe(true);
  });

  it("refuse une date impossible (mois 13) avec un message précis et traduit, sans rien envoyer", async () => {
    render(<ImportContent />);
    await start(['"1","A - B",20241301,1,200000,1']);
    await waitFor(() => expect(screen.getByText(dict.errorAppleDate("20241301"))).toBeInTheDocument());
    expect(h.uploadAppleJson).not.toHaveBeenCalled();
    await waitFor(() => expect(submitBtn()).toBeEnabled());
  });

  it("refuse une heure hors de 0 à 23 avec un message précis", async () => {
    render(<ImportContent />);
    await start(['"1","A - B",20240101,25,200000,1']);
    await waitFor(() => expect(screen.getByText(dict.errorAppleHour("25"))).toBeInTheDocument());
    expect(h.uploadAppleJson).not.toHaveBeenCalled();
  });

  it("ne trace rien dans la console pendant l'import", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    h.uploadAppleJson.mockResolvedValue({ added: 1 });
    render(<ImportContent />);
    await start(['"1","A - B",20240101,1,200000,1']);
    await waitFor(() => expect(h.uploadAppleJson).toHaveBeenCalled());
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("ne reste pas bloqué quand une ligne est mal formée (date manquante)", async () => {
    render(<ImportContent />);
    const user = await selectFiles([new File([`${HEADER}\n"1","A - B",,1,200000,1`], "bad.csv")]);
    await user.click(submitBtn());
    await openWs();
    await waitFor(() => expect(screen.getByText(/Date invalide dans le fichier/)).toBeInTheDocument());
    expect(submitBtn()).toBeEnabled();
  });
});
