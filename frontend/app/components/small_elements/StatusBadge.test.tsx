import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { languages } from "../../constants/locales/lang";
import { ApiStatusBadge } from "./StatusBadge";

const dict = languages.fr.api;

const { api } = vi.hoisted(() => ({ api: { getSpotifyStatus: vi.fn() } }));

vi.mock("../../hooks/useApi", () => ({ useApi: () => api }));
vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: false, retry_after_seconds: 0 });
});

afterEach(() => vi.useRealTimers());

describe("ApiStatusBadge", () => {
  it("affiche « Système actif » au départ et interroge l'API au montage", async () => {
    render(<ApiStatusBadge />);
    await flush();
    expect(screen.getByText(dict.statusActive)).toBeInTheDocument();
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
  });

  it("utilise le style vert hors limitation", async () => {
    const { container } = render(<ApiStatusBadge />);
    await flush();
    expect(container.querySelector(".bg-vert")).toBeInTheDocument();
    expect(container.querySelector(".bg-rouge")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("border-white/5");
  });

  it("affiche « Limite atteinte » et le délai quand l'API est limitée", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 42 });
    const { container } = render(<ApiStatusBadge />);
    await flush();
    expect(screen.getByText(new RegExp(dict.statusRateLimited))).toBeInTheDocument();
    expect(screen.getByText("42", { exact: false })).toHaveTextContent("42s");
    expect(screen.queryByText(dict.statusActive)).not.toBeInTheDocument();
    expect(container.querySelector(".bg-rouge")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("border-rouge/20");
  });

  it("rafraîchit le statut toutes les 60 secondes", async () => {
    render(<ApiStatusBadge />);
    await flush();
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 5 });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByText(new RegExp(dict.statusRateLimited))).toBeInTheDocument();
  });

  it("ne rafraîchit pas avant 60 secondes", async () => {
    render(<ApiStatusBadge />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(59000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
  });

  it("arrête le polling au démontage", async () => {
    const { unmount } = render(<ApiStatusBadge />);
    await flush();
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(180000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
  });

  it("décrémente le compte à rebours chaque seconde sans nouvelle requête", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 10 });
    render(<ApiStatusBadge />);
    await flush();
    expect(screen.getByText("10", { exact: false })).toHaveTextContent("10s");
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText("7", { exact: false })).toHaveTextContent("7s");
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
  });

  it("s'arrête à 0 seconde sans devenir négatif", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 2 });
    render(<ApiStatusBadge />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText("0", { exact: false })).toHaveTextContent("0s");
  });

  it("repart de la nouvelle échéance à chaque statut reçu", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 100 });
    render(<ApiStatusBadge />);
    await flush();
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 30 });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getByText("30", { exact: false })).toHaveTextContent("30s");
  });

  it("n'interroge l'API qu'une fois par minute malgré le compte à rebours et ne relance pas l'effet à chaque rendu", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 500 });
    render(<ApiStatusBadge />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(59000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(2);
  });

  it("nettoie le timer d'une seconde quand le statut n'est plus limité", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 500 });
    render(<ApiStatusBadge />);
    await flush();
    expect(vi.getTimerCount()).toBe(2);
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: false, retry_after_seconds: 0 });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getByText(dict.statusActive)).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("nettoie tous les timers au démontage", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 500 });
    const { unmount } = render(<ApiStatusBadge />);
    await flush();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("journalise l'erreur et garde l'état précédent si l'API échoue", async () => {
    const err = new Error("réseau");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.getSpotifyStatus.mockRejectedValue(err);
    render(<ApiStatusBadge />);
    await flush();
    expect(spy).toHaveBeenCalledWith(expect.any(String), err);
    expect(screen.getByText(dict.statusActive)).toBeInTheDocument();
    spy.mockRestore();
  });
});
