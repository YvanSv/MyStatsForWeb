import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConflitsPage from "./page";

const h = vi.hoisted(() => ({
  getTracksError: vi.fn(),
  updateTrack: vi.fn(),
  loading: false,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../action", () => ({
  useApiAdmin: () => ({ loading: h.loading, getTracksError: h.getTracksError, updateTrack: h.updateTrack }),
}));
vi.mock("react-hot-toast", () => ({ default: h.toast }));

const makeTrack = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Titre A",
  artist_name: "Artiste A",
  album_name: "Album A",
  duration_ms: 1000,
  history: [
    { id: 10, ms_played: 500 },
    { id: 11, ms_played: 1500 },
  ],
  ...over,
});

async function renderPage(tracks: unknown) {
  h.getTracksError.mockResolvedValue(tracks);
  render(<ConflitsPage />);
  await act(async () => {});
}

beforeEach(() => {
  h.getTracksError.mockReset();
  h.updateTrack.mockReset();
  h.updateTrack.mockResolvedValue(undefined);
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.loading = false;
});

describe("ConflitsPage", () => {
  it("charge les pistes au montage (un seul appel)", async () => {
    await renderPage([]);
    expect(h.getTracksError).toHaveBeenCalledTimes(1);
  });

  it("affiche le titre de la page", async () => {
    await renderPage([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Temps d'écoute incohérent/);
  });

  it("affiche le message de chargement tant que loading et pas de données", () => {
    h.loading = true;
    h.getTracksError.mockReturnValue(new Promise(() => {}));
    render(<ConflitsPage />);
    expect(screen.getByText("Chargement des erreurs...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("n'affiche pas le chargement si des données sont déjà présentes", async () => {
    h.loading = true;
    await renderPage([makeTrack()]);
    expect(screen.queryByText("Chargement des erreurs...")).toBeNull();
    expect(screen.getByText(/Titre A/)).toBeInTheDocument();
  });

  it("affiche l'état vide quand il n'y a aucune piste", async () => {
    await renderPage([]);
    expect(screen.getByText(/Aucune donnée incohérente détectée/)).toBeInTheDocument();
  });

  it("n'affiche ni liste ni état vide quand le chargement échoue", async () => {
    h.getTracksError.mockRejectedValue(new Error("boom"));
    render(<ConflitsPage />);
    await act(async () => {});
    expect(screen.queryByText(/Aucune donnée incohérente/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("n'affiche pas d'erreur utilisateur quand le chargement échoue (aucun toast)", async () => {
    h.getTracksError.mockRejectedValue(new Error("boom"));
    render(<ConflitsPage />);
    await act(async () => {});
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("affiche titre, artiste, album et durée de chaque piste", async () => {
    await renderPage([makeTrack(), makeTrack({ id: 2, title: "Titre B", artist_name: "Artiste B", album_name: "Album B", duration_ms: 2000, history: [] })]);
    expect(screen.getByText("Titre A - Artiste A, Album A")).toBeInTheDocument();
    expect(screen.getByText("Titre B - Artiste B, Album B")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tout Sauvegarder" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Brider l'historique" })).toHaveLength(2);
  });

  it("affiche les ID et valeurs de l'historique", async () => {
    await renderPage([makeTrack()]);
    expect(screen.getByText("ID: 10")).toBeInTheDocument();
    expect(screen.getByText("ID: 11")).toBeInTheDocument();
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.map((i) => (i as HTMLInputElement).value)).toEqual(["1000", "500", "1500"]);
  });

  it("marque uniquement les historiques qui dépassent la durée", async () => {
    await renderPage([makeTrack()]);
    expect(screen.getAllByText(/DÉPASSE/)).toHaveLength(1);
  });

  it("valeur limite : ms_played égal à la durée n'est pas une erreur", async () => {
    await renderPage([makeTrack({ history: [{ id: 1, ms_played: 1000 }] })]);
    expect(screen.queryByText(/DÉPASSE/)).toBeNull();
  });

  it("valeur limite : ms_played = durée + 1 est une erreur", async () => {
    await renderPage([makeTrack({ history: [{ id: 1, ms_played: 1001 }] })]);
    expect(screen.getByText(/DÉPASSE/)).toBeInTheDocument();
  });

  it("gère un historique vide", async () => {
    await renderPage([makeTrack({ history: [] })]);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
    expect(screen.queryByText(/DÉPASSE/)).toBeNull();
  });

  it("modifier la durée met à jour le champ et la détection d'erreur", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    const duration = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    await user.clear(duration);
    await user.type(duration, "400");
    expect(duration.value).toBe("400");
    // 500 et 1500 dépassent maintenant 400
    expect(screen.getAllByText(/DÉPASSE/)).toHaveLength(2);
  });

  it("modifier un historique ne change que cet historique", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    await user.clear(inputs[2]);
    await user.type(inputs[2], "900");
    expect(inputs[2].value).toBe("900");
    expect(inputs[1].value).toBe("500");
    expect(inputs[0].value).toBe("1000");
    expect(screen.queryByText(/DÉPASSE/)).toBeNull();
  });

  it("modifier une piste n'affecte pas les autres pistes", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack(), makeTrack({ id: 2, title: "B", duration_ms: 3000, history: [{ id: 20, ms_played: 10 }] })]);
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    await user.clear(inputs[0]);
    await user.type(inputs[0], "7");
    expect(inputs.map((i) => i.value)).toEqual(["7", "500", "1500", "3000", "10"]);
  });

  it("Brider l'historique force ms_played à la durée pour tous les historiques", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    await user.click(screen.getByRole("button", { name: "Brider l'historique" }));
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs.map((i) => i.value)).toEqual(["1000", "1000", "1000"]);
    expect(screen.queryByText(/DÉPASSE/)).toBeNull();
  });

  it("Brider l'historique ne touche pas aux autres pistes ni à l'API", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack(), makeTrack({ id: 2, duration_ms: 3000, history: [{ id: 20, ms_played: 10 }] })]);
    await user.click(screen.getAllByRole("button", { name: "Brider l'historique" })[0]);
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs[4].value).toBe("10");
    expect(h.updateTrack).not.toHaveBeenCalled();
  });

  it("Brider l'historique avec un historique vide ne plante pas", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack({ history: [] })]);
    await user.click(screen.getByRole("button", { name: "Brider l'historique" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("le bouton Brider porte une infobulle explicative", async () => {
    await renderPage([makeTrack()]);
    expect(screen.getByRole("button", { name: "Brider l'historique" })).toHaveAttribute("title", expect.stringContaining("ms_played = duration_ms"));
  });

  it("Tout Sauvegarder envoie la piste modifiée à updateTrack", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    await user.clear(inputs[1]);
    await user.type(inputs[1], "800");
    await user.click(screen.getByRole("button", { name: "Tout Sauvegarder" }));
    expect(h.updateTrack).toHaveBeenCalledTimes(1);
    expect(h.updateTrack).toHaveBeenCalledWith(
      makeTrack({ history: [{ id: 10, ms_played: 800 }, { id: 11, ms_played: 1500 }] }),
    );
  });

  it("Tout Sauvegarder n'envoie que la piste concernée", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack(), makeTrack({ id: 2, title: "B" })]);
    await user.click(screen.getAllByRole("button", { name: "Tout Sauvegarder" })[1]);
    expect(h.updateTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 2, title: "B" }));
  });

  it("affiche un toast de succès après sauvegarde", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    await user.click(screen.getByRole("button", { name: "Tout Sauvegarder" }));
    expect(h.toast.success).toHaveBeenCalledWith("Sauvegarde effectuée !", expect.any(Object));
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("affiche un toast d'erreur si la sauvegarde échoue", async () => {
    const user = userEvent.setup();
    h.updateTrack.mockRejectedValue(new Error("500"));
    await renderPage([makeTrack()]);
    await user.click(screen.getByRole("button", { name: "Tout Sauvegarder" }));
    expect(h.toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde");
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it("n'affiche pas le succès avant la fin de la requête", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    h.updateTrack.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    await renderPage([makeTrack()]);
    await user.click(screen.getByRole("button", { name: "Tout Sauvegarder" }));
    expect(h.toast.success).not.toHaveBeenCalled();
    await act(async () => { resolve(); });
    expect(h.toast.success).toHaveBeenCalledTimes(1);
  });

  it("champ vide : la valeur n'est pas NaN dans l'état envoyé à l'API", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    const duration = screen.getAllByRole("spinbutton")[0];
    await user.clear(duration);
    await user.click(screen.getByRole("button", { name: "Tout Sauvegarder" }));
    const sent = h.updateTrack.mock.calls[0][0];
    expect(Number.isNaN(sent.duration_ms)).toBe(false);
  });

  it("les champs numériques ont un nom accessible", async () => {
    await renderPage([makeTrack()]);
    for (const input of screen.getAllByRole("spinbutton")) {
      expect(input).toHaveAccessibleName();
    }
  });

  it("les boutons sont activables au clavier (Entrée)", async () => {
    const user = userEvent.setup();
    await renderPage([makeTrack()]);
    screen.getByRole("button", { name: "Tout Sauvegarder" }).focus();
    await user.keyboard("{Enter}");
    expect(h.updateTrack).toHaveBeenCalledTimes(1);
  });

  it("regroupe les historiques sous leur piste", async () => {
    await renderPage([makeTrack()]);
    const section = screen.getByText(/Historiques à corriger/).parentElement as HTMLElement;
    expect(within(section).getAllByRole("spinbutton")).toHaveLength(2);
  });
});
