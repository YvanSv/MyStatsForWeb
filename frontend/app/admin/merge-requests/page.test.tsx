import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MergeRequestListPage from "./page";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});


const h = vi.hoisted(() => ({ getMergeRequests: vi.fn() }));

vi.mock("../action", async (orig) => {
  const actual = await orig<typeof import("../action")>();
  return { ...actual, useApiAdmin: () => ({ getMergeRequests: h.getMergeRequests }) };
});

const mr = (over: Record<string, unknown> = {}) => ({
  id: 1,
  entity_type: "ARTIST",
  status: "PENDING",
  priority: "low",
  duplicate_id: 10,
  duplicate_name: "Daft Punk (dup)",
  target_id: 11,
  target_name: "Daft Punk",
  created_at: "2025-01-02",
  ...over,
});

async function renderPage(data: unknown) {
  h.getMergeRequests.mockResolvedValue(data);
  render(<MergeRequestListPage />);
  await act(async () => {});
}

beforeEach(() => {
  h.getMergeRequests.mockReset();
});

describe("MergeRequestListPage", () => {
  it("charge les merge requests au montage (un seul appel)", async () => {
    await renderPage([]);
    expect(h.getMergeRequests).toHaveBeenCalledTimes(1);
  });

  it("affiche 'Chargement...' (ni erreur ni état vide) pendant le chargement", () => {
    h.getMergeRequests.mockReturnValue(new Promise(() => {}));
    render(<MergeRequestListPage />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(screen.queryByText("Erreur")).toBeNull();
    expect(screen.queryByText(/Aucune merge request/)).toBeNull();
  });

  it("une liste vide n'affiche ni chargement ni erreur", async () => {
    await renderPage([]);
    expect(screen.queryByText("Chargement...")).toBeNull();
    expect(screen.queryByText("Erreur")).toBeNull();
    expect(screen.getByText(/Aucune merge request/)).toBeInTheDocument();
  });

  it("une erreur n'affiche ni chargement ni état vide", async () => {
    h.getMergeRequests.mockRejectedValue(new Error("boom"));
    render(<MergeRequestListPage />);
    await act(async () => {});
    expect(screen.queryByText("Chargement...")).toBeNull();
    expect(screen.queryByText(/Aucune merge request/)).toBeNull();
  });

  it("n'affiche pas encore la liste pendant le chargement", () => {
    h.getMergeRequests.mockReturnValue(new Promise(() => {}));
    render(<MergeRequestListPage />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("affiche l'état d'erreur quand le chargement échoue", async () => {
    h.getMergeRequests.mockRejectedValue(new Error("boom"));
    render(<MergeRequestListPage />);
    await act(async () => {});
    expect(screen.getByText("Erreur")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("affiche l'en-tête, le compteur et l'état vide pour une liste vide", async () => {
    await renderPage([]);
    expect(screen.getByRole("heading", { level: 1, name: "Merge Requests en cours" })).toBeInTheDocument();
    expect(screen.getByText(/0 demande de fusion/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune merge request à traiter/)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("affiche le nombre de demandes", async () => {
    await renderPage([mr({ id: 1 }), mr({ id: 2 }), mr({ id: 3 })]);
    expect(screen.getByText(/3 demandes de fusion en attente/)).toBeInTheDocument();
    expect(screen.queryByText(/Aucune merge request/)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("affiche noms du doublon et de la cible, type et date", async () => {
    await renderPage([mr()]);
    const link = screen.getByRole("link");
    expect(within(link).getByText("Daft Punk (dup)")).toBeInTheDocument();
    expect(within(link).getByText("Daft Punk")).toBeInTheDocument();
    expect(within(link).getByText("Artiste")).toBeInTheDocument();
    expect(within(link).getByText(/2025-01-02/)).toBeInTheDocument();
  });

  it.each([["ARTIST", "Artiste"], ["ALBUM", "Album"], ["TRACK", "Titre"]])("affiche le type %s", async (type, label) => {
    await renderPage([mr({ entity_type: type })]);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([["high", "haute"], ["medium", "moyenne"], ["low", "basse"]])("affiche la priorité %s", async (p, label) => {
    await renderPage([mr({ priority: p })]);
    expect(screen.getByText(`Priorité ${label}`)).toBeInTheDocument();
  });

  it("applique un style distinct selon la priorité", async () => {
    await renderPage([mr({ id: 1, priority: "high" }), mr({ id: 2, priority: "medium" }), mr({ id: 3, priority: "low" })]);
    expect(screen.getByText("Priorité haute").className).toMatch(/red/);
    expect(screen.getByText("Priorité moyenne").className).toMatch(/amber/);
    expect(screen.getByText("Priorité basse").className).toMatch(/gray/);
  });

  it("chaque lien pointe vers la page de détail de sa demande (route /admin/merge-requests/[id])", async () => {
    await renderPage([mr({ id: 5 }), mr({ id: 9 })]);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/admin/merge-requests/5", "/admin/merge-requests/9"]);
  });

  it("les liens ont un nom accessible et sont atteignables au clavier", async () => {
    const user = userEvent.setup();
    await renderPage([mr({ id: 1 }), mr({ id: 2 })]);
    const links = screen.getAllByRole("link");
    links.forEach((l) => expect(l).toHaveAccessibleName());
    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.tab();
    expect(links[1]).toHaveFocus();
  });

  it("gère un nom absent (null) sans planter", async () => {
    await renderPage([mr({ duplicate_name: null, target_name: null })]);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("une réponse null affiche l'erreur", async () => {
    await renderPage(null);
    expect(screen.getByText("Erreur")).toBeInTheDocument();
  });
});

const FRENCH = /[àâçéèêëîïôùûœÉ]|Chargement|Aucun|Erreur|Retour|Historique|Rejeter|Approuver|Annuler|Confirmer|Sauvegard|Brider|Dépasse|Requête|Validation|Arbitrage|Raison|Créée|introuvable|demande|écoute|suggér|fusion|modification|Priorité|Accéder|Bienvenue|Gérer|Résoudre|Impact de/;

describe("MergeRequestListPage (anglais)", () => {
beforeEach(() => { lang.current = "en"; });
afterEach(() => { lang.current = "fr"; });

  it("liste en anglais avec pluriel correct", async () => {
    await renderPage([mr({ id: 1, priority: "high" })]);
    expect(screen.getByText("1 merge request awaiting validation.")).toBeInTheDocument();
    expect(screen.getByText("Priority: high")).toBeInTheDocument();
    expect(screen.getByText("Artist")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(FRENCH);
  });

  it("pluriel, état vide, chargement et erreur en anglais", async () => {
    await renderPage([mr({ id: 1 }), mr({ id: 2 })]);
    expect(screen.getByText("2 merge requests awaiting validation.")).toBeInTheDocument();
  });

  it("état vide en anglais", async () => {
    await renderPage([]);
    expect(screen.getByText(/0 merge requests awaiting validation/)).toBeInTheDocument();
    expect(screen.getByText(/No merge request to process/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(FRENCH);
  });

  it("chargement puis erreur en anglais", async () => {
    h.getMergeRequests.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<MergeRequestListPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    unmount();
    h.getMergeRequests.mockRejectedValue(new Error("boom"));
    render(<MergeRequestListPage />);
    await act(async () => {});
    expect(screen.getByText("Error")).toBeInTheDocument();
  });
});
