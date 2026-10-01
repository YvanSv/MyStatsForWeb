import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "../constants/locales/lang";
import * as htmlToImage from "html-to-image";
import toast from "react-hot-toast";
import ResumePage from "./page";
import { LAYOUT_STORAGE_KEY } from "./gridLayout";

const dict = languages.fr.resume;

// --- Mocks -----------------------------------------------------------------

const h = vi.hoisted(() => ({ getResumeStats: vi.fn() }));

vi.mock("../hooks/useApiMyDatas", () => ({ useApiMyDatas: () => ({ getResumeStats: h.getResumeStats }) }));
vi.mock("../context/languageContext", async () => {
  const { languages } = await import("../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
vi.mock("html-to-image", () => ({ toPng: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
// Sous-composants lourds remplacés par des stubs qui exposent ce qu'ils reçoivent
vi.mock("./WidgetsView", () => ({
  WidgetsView: ({ resumeData }: { resumeData: { user: { display_name: string } } }) => (
    <div data-testid="widgets">{resumeData.user.display_name}</div>
  ),
}));
vi.mock("./PropertiesView", () => ({ PropertiesView: () => <div data-testid="properties" /> }));
vi.mock("./ResumeCanvas", () => ({
  default: ({ range, widgets, setWidgets }: {
    range: string | number; widgets: { id: number }[];
    setWidgets: (u: (p: { id: number; type: string; index: number; w: number; h: number; settings: object }[]) => unknown[]) => void;
  }) => (
    <div id="capture-canvas" data-testid="canvas" data-widgets={widgets.map((w) => w.id).join(",")}>
      {String(range)}
      <button onClick={() => setWidgets((p) => [...p, { id: p.length + 1, type: "bio", index: p.length, w: 1, h: 1, settings: {} }])}>ajouter</button>
    </div>
  ),
}));
vi.mock("./HeaderComponent", () => ({
  HeaderComponent: ({ setRange, setOffset }: { setRange: (r: string) => void; setOffset: (n: number) => void }) => (
    <div>
      <button onClick={() => setRange("month")}>mois</button>
      <button onClick={() => setOffset(1)}>précédent</button>
      <button onClick={() => setRange("season")}>saison</button>
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
  vi.mocked(htmlToImage.toPng).mockReset();
  vi.mocked(toast.error).mockReset();
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.getResumeStats.mockResolvedValue(resume("Yvan"));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

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

describe("ResumePage – libellé de saison", () => {
  const labelAt = async (date: string, clicks: string[] = []) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(date));
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("canvas");
    await user.click(screen.getByRole("button", { name: "saison" }));
    for (const c of clicks) await user.click(screen.getByRole("button", { name: c }));
    return () => screen.getByTestId("canvas");
  };

  it("octobre 2026 : Automne 2026 (et non Été comme avec Math.floor(mois/3))", async () => {
    const canvas = await labelAt("2026-10-15T12:00:00");
    await waitFor(() => expect(canvas()).toHaveTextContent("Automne 2026"));
  });

  it("janvier 2026 : l'hiver a commencé en décembre 2025 -> Hiver 2025", async () => {
    const canvas = await labelAt("2026-01-10T12:00:00");
    await waitFor(() => expect(canvas()).toHaveTextContent("Hiver 2025"));
  });

  it("février 2026 : toujours Hiver 2025", async () => {
    const canvas = await labelAt("2026-02-20T12:00:00");
    await waitFor(() => expect(canvas()).toHaveTextContent("Hiver 2025"));
  });

  it("décembre 2025 : Hiver 2025", async () => {
    const canvas = await labelAt("2025-12-05T12:00:00");
    await waitFor(() => expect(canvas()).toHaveTextContent("Hiver 2025"));
  });

  it("mars 2026 : Printemps 2026", async () => {
    const canvas = await labelAt("2026-03-01T12:00:00");
    await waitFor(() => expect(canvas()).toHaveTextContent("Printemps 2026"));
  });

  it("décalage 1 depuis janvier 2026 : Automne 2025", async () => {
    const canvas = await labelAt("2026-01-10T12:00:00", ["précédent"]);
    await waitFor(() => expect(canvas()).toHaveTextContent("Automne 2025"));
  });

  it("décalage 1 depuis août 2026 : Printemps 2026", async () => {
    const canvas = await labelAt("2026-08-31T12:00:00", ["précédent"]);
    await waitFor(() => expect(canvas()).toHaveTextContent("Printemps 2026"));
  });
});

describe("ResumePage – rechargement avec anciennes données", () => {
  const busy = () => document.querySelector("[aria-busy]") as HTMLElement;

  it("n'est pas occupé une fois le premier chargement terminé", async () => {
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    expect(busy()).toHaveAttribute("aria-busy", "false");
    expect(spinner()).not.toBeInTheDocument();
  });

  it("garde les données affichées, marque le conteneur occupé et montre un spinner", async () => {
    const slow = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockResolvedValueOnce(resume("Ancien")).mockReturnValueOnce(slow.promise);
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));

    expect(screen.getByTestId("widgets")).toHaveTextContent("Ancien");
    expect(busy()).toHaveAttribute("aria-busy", "true");
    expect(spinner()).toBeInTheDocument();

    await act(async () => slow.resolve(resume("Nouveau")));
    expect(screen.getByTestId("widgets")).toHaveTextContent("Nouveau");
    expect(busy()).toHaveAttribute("aria-busy", "false");
    expect(spinner()).not.toBeInTheDocument();
  });

  it("ne démonte pas le canvas pendant le rechargement", async () => {
    h.getResumeStats.mockResolvedValueOnce(resume("Ancien")).mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ResumePage />);
    const canvas = await screen.findByTestId("canvas");
    await user.click(screen.getByRole("button", { name: "mois" }));
    expect(screen.getByTestId("canvas")).toBe(canvas);
  });

  it("n'est plus occupé après un échec de rechargement", async () => {
    h.getResumeStats.mockResolvedValueOnce(resume("Ancien")).mockRejectedValueOnce(new Error("x"));
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await waitFor(() => expect(busy()).toHaveAttribute("aria-busy", "false"));
    expect(screen.getByTestId("widgets")).toHaveTextContent("Ancien");
  });

  it("une réponse obsolète ne termine pas l'état de chargement de la requête en cours", async () => {
    const slow = deferred<ReturnType<typeof resume>>();
    const latest = deferred<ReturnType<typeof resume>>();
    h.getResumeStats.mockResolvedValueOnce(resume("Initial")).mockReturnValueOnce(slow.promise).mockReturnValueOnce(latest.promise);
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(screen.getByRole("button", { name: "mois" }));
    await user.click(screen.getByRole("button", { name: "précédent" }));
    await act(async () => slow.resolve(resume("Obsolète")));
    expect(busy()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("widgets")).toHaveTextContent("Initial");
    await act(async () => latest.resolve(resume("Récent")));
    expect(busy()).toHaveAttribute("aria-busy", "false");
  });
});

describe("ResumePage – export de l'image", () => {
  const download = () => screen.getByRole("button", { name: new RegExp(dict.download) });

  it("passe un filtre qui exclut les éléments data-export-ignore", async () => {
    vi.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,xx");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(download());

    const options = vi.mocked(htmlToImage.toPng).mock.calls[0][1] as { filter: (n: Node) => boolean };
    const ignored = document.createElement("div");
    ignored.dataset.exportIgnore = "true";
    expect(options.filter(ignored)).toBe(false);
    expect(options.filter(document.createElement("div"))).toBe(true);
    expect(options.filter(document.createTextNode("texte"))).toBe(true);
  });

  it("télécharge un fichier au nom assaini (slug du pseudo)", async () => {
    h.getResumeStats.mockResolvedValue(resume("Élodie Müller"));
    vi.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,xx");
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(download());
    await waitFor(() => expect(names).toHaveLength(1));
    expect(names[0]).toMatch(/^mystats-year-elodie-muller-\d+\.png$/);
  });

  it("n'écrit jamais « undefined » quand le pseudo est absent", async () => {
    h.getResumeStats.mockResolvedValue({ ...resume("x"), user: {} });
    vi.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,xx");
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const user = userEvent.setup();
    render(<ResumePage />);
    await waitFor(() => expect(screen.getByTestId("canvas")).toBeInTheDocument());
    await user.click(download());
    await waitFor(() => expect(names).toHaveLength(1));
    expect(names[0]).toMatch(/^mystats-year-profil-\d+\.png$/);
  });

  it("affiche un toast d'erreur en plus du console.error si l'export échoue", async () => {
    const failure = new Error("tainted canvas");
    vi.mocked(htmlToImage.toPng).mockRejectedValue(failure);
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(download());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(dict.exportError));
    expect(console.error).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("ne déclenche aucun toast quand l'export réussit", async () => {
    vi.mocked(htmlToImage.toPng).mockResolvedValue("data:image/png;base64,xx");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    await user.click(download());
    await waitFor(() => expect(htmlToImage.toPng).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("ResumePage – sauvegarde de la mise en page", () => {
  const saved = () => JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "null");
  const stored = { version: 1, widgets: [{ id: 3, type: "streams", index: 4, w: 1, h: 1, settings: { a: 1 } }] };

  it("restaure les widgets enregistrés", async () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
    render(<ResumePage />);
    await waitFor(() => expect(screen.getByTestId("canvas")).toHaveAttribute("data-widgets", "3"));
  });

  it("n'écrase pas la mise en page enregistrée par l'état vide initial", async () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<ResumePage />);
    await screen.findByTestId("widgets");
    for (const [, value] of setItem.mock.calls) expect(JSON.parse(value).widgets).toHaveLength(1);
    expect(saved()).toEqual(stored);
  });

  it("enregistre chaque changement de widgets", async () => {
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: "ajouter" }));
    expect(saved().widgets).toEqual([{ id: 1, type: "bio", index: 0, w: 1, h: 1, settings: {} }]);
    await user.click(screen.getByRole("button", { name: "ajouter" }));
    expect(saved().widgets.map((w: { id: number }) => w.id)).toEqual([1, 2]);
  });

  it("ignore un contenu corrompu sans planter", async () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "{corrompu");
    render(<ResumePage />);
    expect(await screen.findByTestId("canvas")).toHaveAttribute("data-widgets", "");
  });

  it("fonctionne même si localStorage lève des exceptions", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    const user = userEvent.setup();
    render(<ResumePage />);
    await user.click(await screen.findByRole("button", { name: "ajouter" }));
    expect(screen.getByTestId("canvas")).toHaveAttribute("data-widgets", "1");
  });
});
