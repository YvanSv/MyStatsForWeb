import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import ResumePage from "./page";

const dict = languages.fr.resume;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({ getResumeStats: vi.fn() }));

vi.mock("../hooks/useApiMyDatas", () => ({ useApiMyDatas: () => ({ getResumeStats: h.getResumeStats }) }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("html-to-image", () => ({ toPng: vi.fn() }));
// Sous-composants lourds remplacés par des stubs qui exposent ce qu'ils reçoivent
vi.mock("./WidgetsView", () => ({
  WidgetsView: ({ resumeData }: { resumeData: { user: { display_name: string } } }) => (
    <div data-testid="widgets">{resumeData.user.display_name}</div>
  ),
}));
vi.mock("./PropertiesView", () => ({ PropertiesView: () => <div data-testid="properties" /> }));
vi.mock("./ResumeCanvas", () => ({
  default: ({ range }: { range: string | number }) => <div data-testid="canvas">{String(range)}</div>,
}));
vi.mock("./HeaderComponent", () => ({
  HeaderComponent: ({ setRange, setOffset }: { setRange: (r: string) => void; setOffset: (n: number) => void }) => (
    <div>
      <button onClick={() => setRange("month")}>mois</button>
      <button onClick={() => setOffset(1)}>précédent</button>
    </div>
  ),
}));

// --- Helpers ---------------------------------------------------------------

const resume = (name: string, streams = 100) => ({
  user: { display_name: name }, topArtists: [], topTracks: [], topAlbums: [],
  minutes: 10, streams, distinct_tracks: 1, distinct_albums: 1, distinct_artists: 1,
});

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const spinner = () => document.querySelector(".animate-spin");

beforeEach(() => {
  vi.clearAllMocks();
  h.getResumeStats.mockReset(); // vide aussi les valeurs « once » non consommées par un test précédent
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.getResumeStats.mockResolvedValue(resume("Yvan"));
});
afterEach(() => vi.restoreAllMocks());

// --- Tests -----------------------------------------------------------------

describe("ResumePage – chargement", () => {
  it("affiche le spinner tant que la réponse n'est pas arrivée", () => {
    h.getResumeStats.mockReturnValue(new Promise(() => {}));
    render(<ResumePage />);
    expect(spinner()).toBeInTheDocument();
    expect(screen.queryByTestId("widgets")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("demande par défaut l'année en cours triée par streams", async () => {
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    expect(h.getResumeStats).toHaveBeenCalledTimes(1);
    expect(h.getResumeStats).toHaveBeenCalledWith({ range: "year", sort: "streams", offset: 0 });
  });

  it("affiche le résumé une fois chargé, sans spinner", async () => {
    render(<ResumePage />);
    expect(await screen.findByTestId("widgets")).toHaveTextContent("Yvan");
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("properties")).toBeInTheDocument();
    expect(screen.getByText(dict.title)).toBeInTheDocument();
    expect(spinner()).not.toBeInTheDocument();
  });

  it("affiche l'année courante comme libellé de période", async () => {
    render(<ResumePage />);
    expect(await screen.findByTestId("canvas")).toHaveTextContent(String(new Date().getFullYear()));
  });
});

describe("ResumePage – échec du chargement", () => {
  it("affiche un message d'erreur au lieu d'un spinner infini", async () => {
    h.getResumeStats.mockRejectedValue(new Error("Erreur 500"));
    render(<ResumePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(dict.loadError);
    expect(spinner()).not.toBeInTheDocument();
    expect(screen.queryByTestId("widgets")).not.toBeInTheDocument();
  });

  it("propose un bouton pour réessayer", async () => {
    h.getResumeStats.mockRejectedValue(new Error("Erreur 500"));
    render(<ResumePage />);
    expect(await screen.findByRole("button", { name: dict.retry })).toBeEnabled();
  });

  it("journalise l'erreur", async () => {
    const failure = new Error("Erreur 500");
    h.getResumeStats.mockRejectedValue(failure);
    render(<ResumePage />);
    await screen.findByRole("alert");
    expect(console.error).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("recharge le résumé au clic sur « Réessayer »", async () => {
    h.getResumeStats.mockRejectedValueOnce(new Error("Erreur 500")).mockResolvedValueOnce(resume("Yvan"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: dict.retry }));
    expect(await screen.findByTestId("widgets")).toHaveTextContent("Yvan");
    expect(h.getResumeStats).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("réessaie avec les mêmes paramètres", async () => {
    h.getResumeStats.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(resume("Yvan"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: dict.retry }));
    await screen.findByTestId("widgets");
    expect(h.getResumeStats.mock.calls[1][0]).toEqual(h.getResumeStats.mock.calls[0][0]);
  });

  it("affiche de nouveau le spinner pendant le nouvel essai", async () => {
    const retry = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockRejectedValueOnce(new Error("x")).mockReturnValueOnce(retry.promise);
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: dict.retry }));
    expect(spinner()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => retry.resolve(resume("Yvan")));
    expect(await screen.findByTestId("widgets")).toBeInTheDocument();
  });

  it("peut échouer plusieurs fois de suite et afficher chaque fois l'erreur", async () => {
    h.getResumeStats.mockRejectedValue(new Error("x"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: dict.retry }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(h.getResumeStats).toHaveBeenCalledTimes(2);
  });

  it("garde le résumé déjà affiché quand un changement de filtre échoue", async () => {
    h.getResumeStats.mockResolvedValueOnce(resume("Yvan")).mockRejectedValueOnce(new Error("x"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await waitFor(() => expect(h.getResumeStats).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("widgets")).toHaveTextContent("Yvan");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ResumePage – changement de filtres", () => {
  it("recharge le résumé avec la nouvelle période", async () => {
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await waitFor(() => expect(h.getResumeStats).toHaveBeenCalledTimes(2));
    expect(h.getResumeStats).toHaveBeenLastCalledWith({ range: "month", sort: "streams", offset: 0 });
  });

  it("recharge le résumé avec le nouveau décalage", async () => {
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "précédent" }));
    await waitFor(() => expect(h.getResumeStats).toHaveBeenCalledTimes(2));
    expect(h.getResumeStats).toHaveBeenLastCalledWith({ range: "year", sort: "streams", offset: 1 });
  });

  it("met à jour le libellé de la période", async () => {
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "précédent" }));
    await waitFor(() => expect(screen.getByTestId("canvas")).toHaveTextContent(String(new Date().getFullYear() - 1)));
  });

  it("n'interroge l'API qu'une fois par changement de filtre", async () => {
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await waitFor(() => expect(h.getResumeStats).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(h.getResumeStats).toHaveBeenCalledTimes(2);
  });
});

describe("ResumePage – réponses dans le désordre", () => {
  it("ignore une réponse obsolète arrivée après une réponse plus récente", async () => {
    const slow = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockReturnValueOnce(resume("Initial")).mockReturnValueOnce(slow.promise).mockReturnValueOnce(resume("Récent"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));      // requête lente
    await user.click(screen.getByRole("button", { name: "précédent" })); // requête rapide, plus récente
    await waitFor(() => expect(screen.getByTestId("widgets")).toHaveTextContent("Récent"));

    await act(async () => slow.resolve(resume("Obsolète")));             // arrive en retard
    expect(screen.getByTestId("widgets")).toHaveTextContent("Récent");
  });

  it("ignore l'échec d'une requête obsolète", async () => {
    const slow = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockReturnValueOnce(resume("Initial")).mockReturnValueOnce(slow.promise).mockReturnValueOnce(resume("Récent"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await user.click(screen.getByRole("button", { name: "précédent" }));
    await waitFor(() => expect(screen.getByTestId("widgets")).toHaveTextContent("Récent"));

    await act(async () => slow.reject(new Error("tardif")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("n'affiche rien après le démontage quand la réponse arrive ensuite", async () => {
    const pending = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockReturnValue(pending.promise);
    const { unmount } = render(<ResumePage />);
    unmount();
    await act(async () => pending.resolve(resume("Yvan")));
    expect(console.error).not.toHaveBeenCalled();
  });
});
