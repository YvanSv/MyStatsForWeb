/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateRequestListPage from "./page";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});


const h = vi.hoisted(() => ({ getCreateRequests: vi.fn() }));

vi.mock("../action", () => ({
  useApiAdmin: () => ({ getCreateRequests: h.getCreateRequests }),
}));

const makeReq = (over: any = {}) => ({
  id: 1,
  track_id: 10,
  history_count: 3,
  match_data: { suggestions: [] },
  created_at: "2025-01-15T12:00:00Z",
  track: { id: 10, title: "Artiste - Titre", artist: { name: "Daft Punk" } },
  ...over,
});

beforeEach(() => {
  h.getCreateRequests.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CreateRequestListPage", () => {
  it("affiche l'état de chargement tant que la requête est en cours", () => {
    h.getCreateRequests.mockReturnValue(new Promise(() => {}));
    render(<CreateRequestListPage />);
    expect(screen.getByText("Chargement des requêtes...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("appelle getCreateRequests une seule fois au montage", async () => {
    h.getCreateRequests.mockResolvedValue([]);
    render(<CreateRequestListPage />);
    await screen.findByRole("heading", { level: 1 });
    expect(h.getCreateRequests).toHaveBeenCalledTimes(1);
  });

  it("affiche le titre et le compteur de modifications", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq({ id: 1 }), makeReq({ id: 2 })]);
    render(<CreateRequestListPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Validations en attente" })).toBeInTheDocument();
    expect(screen.getByText(/2 modifications suggérées via MusicBrainz/)).toBeInTheDocument();
  });

  it("affiche une carte par requête avec titre, artiste et écoutes", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq()]);
    render(<CreateRequestListPage />);
    const link = await screen.findByRole("link");
    expect(within(link).getByText("Artiste - Titre")).toBeInTheDocument();
    expect(within(link).getByText("Daft Punk")).toBeInTheDocument();
    expect(within(link).getByText(/3 écoutes/)).toBeInTheDocument();
  });

  it("formate la date de création en français (jour + mois abrégé)", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq({ created_at: "2025-01-15T12:00:00Z" })]);
    render(<CreateRequestListPage />);
    expect(await screen.findByText(/15 janv/)).toBeInTheDocument();
  });

  it("chaque lien pointe vers le détail de sa requête", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq({ id: 7 }), makeReq({ id: 42 })]);
    render(<CreateRequestListPage />);
    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/admin/create-requests/7");
    expect(links[1]).toHaveAttribute("href", "/admin/create-requests/42");
  });

  it("conserve l'ordre renvoyé par l'API", async () => {
    h.getCreateRequests.mockResolvedValue([
      makeReq({ id: 1, track: { id: 1, title: "A", artist: { name: "Premier" } } }),
      makeReq({ id: 2, track: { id: 2, title: "B", artist: { name: "Second" } } }),
    ]);
    render(<CreateRequestListPage />);
    const links = await screen.findAllByRole("link");
    expect(links[0]).toHaveTextContent("Premier");
    expect(links[1]).toHaveTextContent("Second");
  });

  it("affiche l'état vide quand il n'y a aucune requête", async () => {
    h.getCreateRequests.mockResolvedValue([]);
    render(<CreateRequestListPage />);
    expect(await screen.findByText("Tout est propre ! Aucune requête en attente.")).toBeInTheDocument();
    expect(screen.getByText(/0 modification suggérée/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("n'affiche pas l'état vide quand la liste est remplie", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq()]);
    render(<CreateRequestListPage />);
    await screen.findByRole("link");
    expect(screen.queryByText(/Aucune requête en attente/)).toBeNull();
  });

  it("affiche un message d'erreur si l'API rejette", async () => {
    h.getCreateRequests.mockRejectedValue(new Error("boom"));
    render(<CreateRequestListPage />);
    expect(await screen.findByText(/Erreur lors de la récupération des données/)).toBeInTheDocument();
    expect(screen.queryByText("Chargement des requêtes...")).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("affiche l'erreur quand l'API renvoie null", async () => {
    h.getCreateRequests.mockResolvedValue(null);
    render(<CreateRequestListPage />);
    expect(await screen.findByText(/Erreur lors de la récupération des données/)).toBeInTheDocument();
  });

  it("retire le chargement une fois la réponse reçue", async () => {
    let resolve!: (v: any) => void;
    h.getCreateRequests.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<CreateRequestListPage />);
    expect(screen.getByText("Chargement des requêtes...")).toBeInTheDocument();
    await act(async () => { resolve([makeReq()]); });
    expect(screen.queryByText("Chargement des requêtes...")).toBeNull();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  describe("données absentes", () => {
    it("affiche 'Track inconnu' et 'Artiste inconnu' sans track", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq({ track: undefined })]);
      render(<CreateRequestListPage />);
      expect(await screen.findByText("Track inconnu")).toBeInTheDocument();
      expect(screen.getByText("Artiste inconnu")).toBeInTheDocument();
    });

    it("affiche 'Artiste inconnu' quand track.artist est null", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq({ track: { id: 1, title: "T", artist: null } })]);
      render(<CreateRequestListPage />);
      expect(await screen.findByText("T")).toBeInTheDocument();
      expect(screen.getByText("Artiste inconnu")).toBeInTheDocument();
    });

    it("affiche 'Track inconnu' quand le titre est vide", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq({ track: { id: 1, title: "", artist: { name: "X" } } })]);
      render(<CreateRequestListPage />);
      expect(await screen.findByText("Track inconnu")).toBeInTheDocument();
    });

    it("affiche 0 écoute quand history_count est absent ou nul", async () => {
      h.getCreateRequests.mockResolvedValue([
        makeReq({ id: 1, history_count: undefined }),
        makeReq({ id: 2, history_count: null }),
        makeReq({ id: 3, history_count: 0 }),
      ]);
      render(<CreateRequestListPage />);
      expect(await screen.findAllByText(/0 écoute(?!s)/)).toHaveLength(3);
    });

    it("affiche un grand nombre d'écoutes sans le tronquer", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq({ history_count: 1234567 })]);
      render(<CreateRequestListPage />);
      expect(await screen.findByText(/1234567 écoutes/)).toBeInTheDocument();
    });
  });

  describe("accessibilité", () => {
    it("expose un titre de niveau 1 et des liens focalisables au clavier", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq({ id: 1 }), makeReq({ id: 2 })]);
      const { default: userEvent } = await import("@testing-library/user-event");
      const user = userEvent.setup();
      render(<CreateRequestListPage />);
      const links = await screen.findAllByRole("link");
      await user.tab();
      expect(links[0]).toHaveFocus();
      await user.tab();
      expect(links[1]).toHaveFocus();
    });

    it("le nom accessible du lien contient le titre et l'artiste", async () => {
      h.getCreateRequests.mockResolvedValue([makeReq()]);
      render(<CreateRequestListPage />);
      const link = await screen.findByRole("link", { name: /Artiste - Titre/ });
      expect(link).toHaveAccessibleName(/Daft Punk/);
    });
  });

  it("ne met pas à jour l'état après démontage sans erreur", async () => {
    let resolve!: (v: any) => void;
    h.getCreateRequests.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = render(<CreateRequestListPage />);
    unmount();
    await act(async () => { resolve([makeReq()]); });
    await waitFor(() => expect(h.getCreateRequests).toHaveBeenCalledTimes(1));
  });
});

const FRENCH = /[àâçéèêëîïôùûœÉ]|Chargement|Aucun|Erreur|Retour|Historique|Rejeter|Approuver|Annuler|Confirmer|Sauvegard|Brider|Dépasse|Requête|Validation|Arbitrage|Raison|Créée|introuvable|demande|écoute|suggér|fusion|modification|Priorité|Accéder|Bienvenue|Gérer|Résoudre|Impact de/;

describe("CreateRequestListPage (anglais)", () => {
beforeEach(() => { lang.current = "en"; });
afterEach(() => { lang.current = "fr"; });

  it("liste en anglais, dates en en-US, pluriels", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq({ id: 1, history_count: 1 }), makeReq({ id: 2, track: null, history_count: 0 })]);
    render(<CreateRequestListPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Pending validations" })).toBeInTheDocument();
    expect(screen.getByText("2 changes suggested via MusicBrainz.")).toBeInTheDocument();
    expect(screen.getByText("1 play")).toBeInTheDocument();
    expect(screen.getByText("0 plays")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown track")).toHaveLength(1);
    expect(screen.getAllByText("Unknown artist")).toHaveLength(1);
    expect(screen.getAllByText("Jan 15").length).toBe(2);
    expect(document.body.textContent).not.toMatch(FRENCH);
  });

  it("singulier, chargement, erreur et état vide en anglais", async () => {
    h.getCreateRequests.mockReturnValue(new Promise(() => {}));
    const first = render(<CreateRequestListPage />);
    expect(screen.getByText("Loading requests...")).toBeInTheDocument();
    first.unmount();
    h.getCreateRequests.mockResolvedValue(null);
    const second = render(<CreateRequestListPage />);
    expect(await screen.findByText("Error while fetching data")).toBeInTheDocument();
    second.unmount();
    h.getCreateRequests.mockResolvedValue([]);
    render(<CreateRequestListPage />);
    expect(await screen.findByText("All clean! No pending requests.")).toBeInTheDocument();
    expect(screen.getByText("0 changes suggested via MusicBrainz.")).toBeInTheDocument();
  });

  it("1 modification au singulier", async () => {
    h.getCreateRequests.mockResolvedValue([makeReq()]);
    render(<CreateRequestListPage />);
    expect(await screen.findByText("1 change suggested via MusicBrainz.")).toBeInTheDocument();
  });
});
