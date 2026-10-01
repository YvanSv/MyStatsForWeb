/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateRequestDetailPage from "./page";

const h = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  params: { id: "5" } as { id: string },
  getCreateRequestById: vi.fn(),
  resolveCreateRequest: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh }),
  useParams: () => h.params,
  usePathname: () => "/admin/create-requests/5",
}));
vi.mock("../../action", () => ({
  useApiAdmin: () => ({
    getCreateRequestById: h.getCreateRequestById,
    resolveCreateRequest: h.resolveCreateRequest,
  }),
}));

const suggestions = [
  { title: "Titre A", artist: "Artiste A", album: "Album A", duration_ms: 185000, isrc: "FR0000000001" },
  { title: "Titre B", artist: "Artiste B", album: "Album B", isrc: "FR0000000002" },
];

const makeReq = (over: any = {}) => ({
  id: 5,
  track_id: 10,
  created_at: "2025-01-15T12:00:00Z",
  reason: "Doublon probable",
  match_data: { suggestions },
  track: {
    id: 10,
    title: "Daft Punk - One More Time",
    mappings: [
      { id: 1, provider: "spotify", provider_id: "sp123" },
      { id: 2, provider: "deezer", provider_id: "dz456" },
    ],
    history: [
      { id: 1, provider: "spotify", played_at: "2025-01-10T10:30:00Z", ms_played: 60000 },
      { id: 2, provider: "deezer", played_at: "2025-01-11T10:30:00Z", ms_played: 215000 },
    ],
  },
  ...over,
});

const renderLoaded = async (req: any = makeReq()) => {
  h.getCreateRequestById.mockResolvedValue(req);
  const utils = render(<CreateRequestDetailPage />);
  await screen.findByRole("heading", { level: 1 });
  return utils;
};

beforeEach(() => {
  h.push.mockReset();
  h.refresh.mockReset();
  h.getCreateRequestById.mockReset();
  h.resolveCreateRequest.mockReset();
  h.params = { id: "5" };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("CreateRequestDetailPage - chargement", () => {
  it("affiche le chargement puis le contenu", async () => {
    let resolve!: (v: any) => void;
    h.getCreateRequestById.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<CreateRequestDetailPage />);
    expect(screen.getByText("Chargement de la requête...")).toBeInTheDocument();
    await act(async () => { resolve(makeReq()); });
    expect(screen.queryByText("Chargement de la requête...")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Validation des métadonnées" })).toBeInTheDocument();
  });

  it("appelle l'API avec l'identifiant numérique de l'URL", async () => {
    h.params = { id: "123" };
    await renderLoaded(makeReq({ id: 123 }));
    expect(h.getCreateRequestById).toHaveBeenCalledTimes(1);
    expect(h.getCreateRequestById).toHaveBeenCalledWith(123);
  });

  it("affiche 'Requête introuvable' quand l'API renvoie null", async () => {
    h.getCreateRequestById.mockResolvedValue(null);
    render(<CreateRequestDetailPage />);
    expect(await screen.findByText(/Requête introuvable \(ID: 5\)/)).toBeInTheDocument();
  });

  it("affiche 'Requête introuvable' quand l'API rejette", async () => {
    h.getCreateRequestById.mockRejectedValue(new Error("404"));
    render(<CreateRequestDetailPage />);
    expect(await screen.findByText(/Requête introuvable/)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it("n'appelle pas l'API et affiche 'introuvable' si l'ID n'est pas numérique", async () => {
    h.params = { id: "abc" };
    render(<CreateRequestDetailPage />);
    expect(await screen.findByText(/Requête introuvable \(ID: NaN\)/)).toBeInTheDocument();
    expect(h.getCreateRequestById).not.toHaveBeenCalled();
  });

  it("n'appelle pas l'API si l'ID vaut 0", async () => {
    h.params = { id: "0" };
    render(<CreateRequestDetailPage />);
    expect(await screen.findByText(/Requête introuvable \(ID: 0\)/)).toBeInTheDocument();
    expect(h.getCreateRequestById).not.toHaveBeenCalled();
  });
});

describe("CreateRequestDetailPage - rendu", () => {
  it("affiche l'ID de la requête, la date et le lien de retour", async () => {
    await renderLoaded();
    expect(screen.getByText(/ID Requête: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Créée le 15 janvier 2025/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retour à la liste/ })).toHaveAttribute("href", "/admin/create-requests");
  });

  it("affiche la raison quand elle est fournie", async () => {
    await renderLoaded();
    expect(screen.getByText("Raison de la requête :")).toBeInTheDocument();
    expect(screen.getByText(/Doublon probable/)).toBeInTheDocument();
  });

  it("masque la raison quand elle est absente ou vide", async () => {
    await renderLoaded(makeReq({ reason: "" }));
    expect(screen.queryByText("Raison de la requête :")).toBeNull();
  });

  it("sépare artiste et titre de la track actuelle", async () => {
    await renderLoaded();
    const artiste = screen.getByText("Artiste").nextElementSibling;
    const titre = screen.getByText("Titre").nextElementSibling;
    expect(artiste).toHaveTextContent("Daft Punk");
    expect(titre).toHaveTextContent("One More Time");
    expect(screen.getByText("ID Interne").nextElementSibling).toHaveTextContent("10");
  });

  it("affiche '—' pour le titre quand le titre ne contient pas ' - '", async () => {
    await renderLoaded(makeReq({ track: { ...makeReq().track, title: "Sans séparateur" } }));
    expect(screen.getByText("Artiste").nextElementSibling).toHaveTextContent("Sans séparateur");
    expect(screen.getByText("Titre").nextElementSibling).toHaveTextContent("—");
  });

  it("affiche la durée max d'écoute au format m:ss", async () => {
    await renderLoaded();
    expect(screen.getByText("Durée max écoute").nextElementSibling).toHaveTextContent("3:35");
  });

  it("affiche les mappings existants", async () => {
    await renderLoaded();
    expect(screen.getAllByText("spotify").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("sp123")).toBeInTheDocument();
    expect(screen.getAllByText("deezer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("dz456")).toBeInTheDocument();
  });

  it("affiche l'historique avec date, heure et durée", async () => {
    await renderLoaded();
    expect(screen.getByText(/10\/01\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/11\/01\/2025/)).toBeInTheDocument();
    expect(screen.getByText("1:00")).toBeInTheDocument();
    expect(screen.getAllByText("3:35").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche les messages vides sans mappings ni historique", async () => {
    await renderLoaded(makeReq({ track: { id: 10, title: "A - B", mappings: [], history: [] } }));
    expect(screen.getByText("Aucun mapping pour le moment.")).toBeInTheDocument();
    expect(screen.getByText("Aucun historique d'écoute.")).toBeInTheDocument();
  });

  it("affiche les messages vides quand mappings et history sont absents", async () => {
    await renderLoaded(makeReq({ track: { id: 10, title: "A - B" } }));
    expect(screen.getByText("Aucun mapping pour le moment.")).toBeInTheDocument();
    expect(screen.getByText("Aucun historique d'écoute.")).toBeInTheDocument();
    expect(screen.getByText("Durée max écoute").nextElementSibling).toHaveTextContent("—");
  });

  it("affiche '—' pour la durée max quand l'historique est vide", async () => {
    await renderLoaded(makeReq({ track: { id: 10, title: "A - B", history: [] } }));
    expect(screen.getByText("Durée max écoute").nextElementSibling).toHaveTextContent("—");
  });

  it("ne plante pas quand la requête n'a pas de track", async () => {
    await renderLoaded(makeReq({ track: undefined }));
    expect(screen.getByText("Aucun mapping pour le moment.")).toBeInTheDocument();
    expect(screen.getByText("ID Interne").nextElementSibling).toHaveTextContent("—");
  });

  it("arrondit correctement une durée proche de la minute (59,5 s -> 1:00)", async () => {
    await renderLoaded(makeReq({
      track: { id: 10, title: "A - B", history: [{ id: 1, provider: "p", played_at: "2025-01-10T10:30:00Z", ms_played: 59500 }] },
    }));
    expect(screen.getByText("Durée max écoute").nextElementSibling).toHaveTextContent("1:00");
  });

  it("formate une durée inférieure à 10 secondes avec un zéro", async () => {
    await renderLoaded(makeReq({
      track: { id: 10, title: "A - B", history: [{ id: 1, provider: "p", played_at: "2025-01-10T10:30:00Z", ms_played: 65000 }] },
    }));
    expect(screen.getByText("Durée max écoute").nextElementSibling).toHaveTextContent("1:05");
  });
});

describe("CreateRequestDetailPage - suggestions", () => {
  it("affiche une carte par suggestion avec titre, artiste, album et ISRC", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 4, name: /Titre A — 3:05/ })).toBeInTheDocument();
    expect(screen.getByText(/Artiste A • Album A/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR0000000001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR0000000002" })).toBeInTheDocument();
  });

  it("affiche '??' quand la durée d'une suggestion est inconnue", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 4, name: /Titre B — \?\?/ })).toBeInTheDocument();
  });

  it("ne rend aucune suggestion quand match_data est vide ou absent", async () => {
    await renderLoaded(makeReq({ match_data: {} }));
    expect(screen.queryByRole("heading", { level: 4, name: /Titre/ })).toBeNull();
    expect(screen.queryByText(/DÉFINIR COMME MASTER|MASTER SÉLECTIONNÉ/)).toBeNull();
  });

  it("ne plante pas quand match_data est null", async () => {
    await renderLoaded(makeReq({ match_data: null }));
    expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
  });

  it("sélectionne la première suggestion comme master par défaut", async () => {
    await renderLoaded();
    expect(screen.getAllByText("MASTER SÉLECTIONNÉ")).toHaveLength(1);
    expect(screen.getAllByText("DÉFINIR COMME MASTER")).toHaveLength(1);
    const first = screen.getByRole("heading", { name: /Titre A/ }).closest("div.p-4")!;
    expect(within(first as HTMLElement).getByText("MASTER SÉLECTIONNÉ")).toBeInTheDocument();
  });

  it("changer de master via le bouton déplace la sélection", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "DÉFINIR COMME MASTER" }));
    const second = screen.getByRole("heading", { name: /Titre B/ }).closest("div.p-4") as HTMLElement;
    expect(within(second).getByText("MASTER SÉLECTIONNÉ")).toBeInTheDocument();
    expect(screen.getAllByText("MASTER SÉLECTIONNÉ")).toHaveLength(1);
  });

  it("cliquer sur la carte sélectionne aussi le master", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByText(/Artiste B • Album B/));
    const second = screen.getByRole("heading", { name: /Titre B/ }).closest("div.p-4") as HTMLElement;
    expect(within(second).getByText("MASTER SÉLECTIONNÉ")).toBeInTheDocument();
  });

  it("le bouton master est activable au clavier", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    screen.getByRole("button", { name: "DÉFINIR COMME MASTER" }).focus();
    await user.keyboard("{Enter}");
    const second = screen.getByRole("heading", { name: /Titre B/ }).closest("div.p-4") as HTMLElement;
    expect(within(second).getByText("MASTER SÉLECTIONNÉ")).toBeInTheDocument();
  });

  it("cliquer sur un ISRC ne change pas le master (propagation stoppée)", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "FR0000000002" }));
    const first = screen.getByRole("heading", { name: /Titre A/ }).closest("div.p-4") as HTMLElement;
    expect(within(first).getByText("MASTER SÉLECTIONNÉ")).toBeInTheDocument();
  });

  it("un ISRC se sélectionne puis se désélectionne", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const btn = screen.getByRole("button", { name: "FR0000000001" });
    expect(btn.className).not.toMatch(/bg-vert\/20/);
    await user.click(btn);
    expect(btn.className).toMatch(/bg-vert\/20/);
    await user.click(btn);
    expect(btn.className).not.toMatch(/bg-vert\/20/);
  });
});

describe("CreateRequestDetailPage - résolution", () => {
  it("approuver envoie l'id, true, master 0 et aucun ISRC par défaut", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    expect(h.resolveCreateRequest).toHaveBeenCalledTimes(1);
    expect(h.resolveCreateRequest).toHaveBeenCalledWith(5, true, 0, []);
  });

  it("rejeter envoie false", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(h.resolveCreateRequest).toHaveBeenCalledWith(5, false, 0, []);
  });

  it("transmet le master et les ISRC choisis", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "DÉFINIR COMME MASTER" }));
    await user.click(screen.getByRole("button", { name: "FR0000000001" }));
    await user.click(screen.getByRole("button", { name: "FR0000000002" }));
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    expect(h.resolveCreateRequest).toHaveBeenCalledWith(5, true, 1, ["FR0000000001", "FR0000000002"]);
  });

  it("ne transmet pas un ISRC désélectionné", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    const a = screen.getByRole("button", { name: "FR0000000001" });
    await user.click(a);
    await user.click(a);
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    expect(h.resolveCreateRequest).toHaveBeenCalledWith(5, true, 0, []);
  });

  it("redirige vers la liste et rafraîchit après succès", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/admin/create-requests"));
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("désactive les deux boutons pendant la résolution et ignore un second clic", async () => {
    const user = userEvent.setup();
    let resolve!: (v: any) => void;
    h.resolveCreateRequest.mockReturnValue(new Promise((r) => { resolve = r; }));
    await renderLoaded();
    const approve = screen.getByRole("button", { name: "Approuver" });
    const reject = screen.getByRole("button", { name: "Rejeter" });
    await user.click(approve);
    expect(approve).toBeDisabled();
    expect(reject).toBeDisabled();
    await user.click(approve);
    await user.click(reject);
    expect(h.resolveCreateRequest).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({}); });
    expect(approve).toBeEnabled();
  });

  it("affiche une alerte et reste sur la page en cas d'échec", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockRejectedValue(new Error("fail"));
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Erreur lors de la résolution."));
    expect(h.push).not.toHaveBeenCalled();
    expect(h.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Rejeter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Approuver" })).toBeEnabled();
  });

  it("permet de réessayer après un échec", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce({});
    await renderLoaded();
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Approuver" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/admin/create-requests"));
    expect(h.resolveCreateRequest).toHaveBeenCalledTimes(2);
  });

  it("les boutons d'action sont atteignables au clavier", async () => {
    const user = userEvent.setup();
    h.resolveCreateRequest.mockResolvedValue({});
    await renderLoaded();
    screen.getByRole("button", { name: "Approuver" }).focus();
    await user.keyboard(" ");
    expect(h.resolveCreateRequest).toHaveBeenCalledWith(5, true, 0, []);
  });

  it("affiche le bloc 'Arbitrage Final' avec ses explications", async () => {
    await renderLoaded();
    expect(screen.getByRole("heading", { level: 4, name: "Arbitrage Final" })).toBeInTheDocument();
    expect(screen.getByText(/écraseront ou compléteront/)).toBeInTheDocument();
  });
});
