/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NowPlayingWidget } from "./NowPlayingWidget";

vi.mock("../../../context/languageContext", async () => {
  const { languages } = await import("../../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const spotify = vi.hoisted(() => ({ value: {} as any }));
vi.mock("../../../context/currentlyPlayingContext", () => ({ useSpotify: () => spotify.value }));
vi.mock("../../../components/small_elements/SpotifyLiveCard", () => ({
  default: (p: any) => <div data-testid="card" data-size={p.size} data-progress={p.currentProgress}>{p.data ? p.data.title : "vide"}</div>,
}));

const track = { title: "Titre X", artist_name: "Art", album_name: "Alb", cover_url: "c.png", progress_ms: 10, duration_ms: 100 };
const live = (is_listening: boolean, data: any = track) => { spotify.value = { listening: { is_listening, data }, localProgress: 5000 }; };

beforeEach(() => live(true));

describe("NowPlayingWidget", () => {
  it.each([[2, 1, "xs"], [3, 1, "xs"], [2, 2, "xs"], [3, 2, "md"], [3, 3, "md"]])("%ix%i : carte en taille %s", (w, h, size) => {
    render(<NowPlayingWidget w={w} h={h} />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", size);
    expect(screen.getByTestId("card")).toHaveAttribute("data-progress", "5000");
    expect(screen.getByText("Titre X")).toBeInTheDocument();
  });

  it("1x1 : pochette et titre compacts", () => {
    const { container } = render(<NowPlayingWidget w={1} h={1} />);
    expect(screen.getByText("Titre X")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "c.png");
    expect(screen.queryByTestId("card")).toBeNull();
  });

  it("1x1 sans pochette : pastille", () => {
    live(true, { ...track, cover_url: "" });
    const { container } = render(<NowPlayingWidget w={1} h={1} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it.each([[2, 1], [1, 1], [3, 3]])("%ix%i, rien en écoute : message de repli", (w, h) => {
    live(false, track);
    render(<NowPlayingWidget w={w} h={h} />);
    expect(screen.getByText("Silence radio sur Spotify")).toBeInTheDocument();
    expect(screen.queryByText("Titre X")).toBeNull();
  });

  it("écoute sans données : repli", () => {
    live(true, null);
    render(<NowPlayingWidget w={2} h={1} />);
    expect(screen.getByText("Silence radio sur Spotify")).toBeInTheDocument();
  });

  it("contenu dynamique exclu de l'image exportée", () => {
    const { container } = render(<NowPlayingWidget w={2} h={1} />);
    expect(container.firstElementChild).toHaveAttribute("data-export-ignore", "true");
  });
});
