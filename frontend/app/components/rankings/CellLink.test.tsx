import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DataInfo } from "@/app/data/DataInfos";
import { languages } from "../../constants/locales/lang";
import GridCell from "./GridCell";
import SmallGridCell from "./SmallGridCell";
import ListCell from "./ListCell";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ alt, src }: any) => <img alt={alt} src={src} />, // eslint-disable-line @next/next/no-img-element
}));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});

const base = { play_count: 1, total_minutes: 2, engagement: 3, rating: 1 };
const track: DataInfo = { ...base, type: "track", id: 12, title: "Titre A", artist: "Artiste A", album: "Album A" };
const album: DataInfo = { ...base, type: "album", id: 7, name: "Album B", artist: "Artiste B" };
const artist: DataInfo = { ...base, type: "artist", id: 3, name: "Artiste C" };
const noId: DataInfo = { ...base, type: "track", title: "Sans id" };

const cells = [["GridCell", GridCell], ["SmallGridCell", SmallGridCell], ["ListCell", ListCell]] as const;

describe.each(cells)("%s – lien vers la page de détail", (_name, Cell) => {
  it.each([
    [track, "/my/tracks/12", "Titre A"],
    [album, "/my/albums/7", "Album B"],
    [artist, "/my/artists/3", "Artiste C"],
  ])("avec linkTo : lien %# vers %s", (element, href, name) => {
    render(<Cell element={element} index={0} sort="play_count" linkTo />);
    const link = screen.getByRole("link", { name: languages.fr.rankingcell.openDetail(name) });
    expect(link).toHaveAttribute("href", href);
    // le titre reste un titre de niveau 3 et le lien est le seul de la cellule (pas de lien imbriqué)
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(link);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(link.querySelector("a")).toBeNull();
  });

  it("sans linkTo (classements publics) : aucun lien, titre inchangé", () => {
    render(<Cell element={track} index={0} sort="play_count" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Titre A" })).toBeInTheDocument();
  });

  it("avec linkTo mais sans id : pas de lien", () => {
    render(<Cell element={noId} index={0} sort="play_count" linkTo />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Sans id" })).toBeInTheDocument();
  });
});
