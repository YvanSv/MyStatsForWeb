import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MergeRequestListPage from "./page";

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
    expect(screen.getByText(/0 demande\(s\) de fusion/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune merge request à traiter/)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("affiche le nombre de demandes", async () => {
    await renderPage([mr({ id: 1 }), mr({ id: 2 }), mr({ id: 3 })]);
    expect(screen.getByText(/3 demande\(s\) de fusion en attente/)).toBeInTheDocument();
    expect(screen.queryByText(/Aucune merge request/)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("affiche noms du doublon et de la cible, type et date", async () => {
    await renderPage([mr()]);
    const link = screen.getByRole("link");
    expect(within(link).getByText("Daft Punk (dup)")).toBeInTheDocument();
    expect(within(link).getByText("Daft Punk")).toBeInTheDocument();
    expect(within(link).getByText("ARTIST")).toBeInTheDocument();
    expect(within(link).getByText(/2025-01-02/)).toBeInTheDocument();
  });

  it.each(["ARTIST", "ALBUM", "TRACK"])("affiche le type %s", async (type) => {
    await renderPage([mr({ entity_type: type })]);
    expect(screen.getByText(type)).toBeInTheDocument();
  });

  it.each([["high"], ["medium"], ["low"]])("affiche la priorité %s", async (p) => {
    await renderPage([mr({ priority: p })]);
    expect(screen.getByText(`Priorité ${p}`)).toBeInTheDocument();
  });

  it("applique un style distinct selon la priorité", async () => {
    await renderPage([mr({ id: 1, priority: "high" }), mr({ id: 2, priority: "medium" }), mr({ id: 3, priority: "low" })]);
    expect(screen.getByText("Priorité high").className).toMatch(/red/);
    expect(screen.getByText("Priorité medium").className).toMatch(/amber/);
    expect(screen.getByText("Priorité low").className).toMatch(/gray/);
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
