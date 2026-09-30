import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ApiStatusBadge } from "./StatusBadge";

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
  it("affiche 'System Active' au départ et interroge l'API au montage", async () => {
    render(<ApiStatusBadge />);
    await flush();
    expect(screen.getByText("System Active")).toBeInTheDocument();
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(1);
  });

  it("utilise le style vert hors limitation", async () => {
    const { container } = render(<ApiStatusBadge />);
    await flush();
    expect(container.querySelector(".bg-vert")).toBeInTheDocument();
    expect(container.querySelector(".bg-rouge")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("border-white/5");
  });

  it("affiche Rate Limited et le délai quand l'API est limitée", async () => {
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 42 });
    const { container } = render(<ApiStatusBadge />);
    await flush();
    expect(screen.getByText(/Rate Limited/)).toBeInTheDocument();
    expect(screen.getByText("42", { exact: false })).toHaveTextContent("42s");
    expect(screen.queryByText("System Active")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-rouge")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("border-rouge/20");
  });

  it("rafraîchit le statut toutes les 60 secondes", async () => {
    render(<ApiStatusBadge />);
    await flush();
    api.getSpotifyStatus.mockResolvedValue({ is_rate_limited: true, retry_after_seconds: 5 });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(api.getSpotifyStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Rate Limited/)).toBeInTheDocument();
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

  it("journalise l'erreur et garde l'état précédent si l'API échoue", async () => {
    const err = new Error("réseau");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    api.getSpotifyStatus.mockRejectedValue(err);
    render(<ApiStatusBadge />);
    await flush();
    expect(spy).toHaveBeenCalledWith(expect.any(String), err);
    expect(screen.getByText("System Active")).toBeInTheDocument();
    spy.mockRestore();
  });
});
