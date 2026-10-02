import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderCellSubtitle } from "./CellSubtitle";
import type { DataInfo } from "@/app/data/DataInfos";

const el = (o: Partial<DataInfo>): DataInfo => ({ play_count: 0, total_minutes: 0, engagement: 0, rating: 0, type: "track", ...o });
const html = (node: React.ReactNode) => render(<div>{node}</div>).container.innerHTML;

describe("renderCellSubtitle", () => {
  it("rien pour un artiste", () => expect(renderCellSubtitle(el({ type: "artist", artist: "X" }), "grid")).toBeNull());
  it("album : seulement l'artiste", () => expect(html(renderCellSubtitle(el({ type: "album", artist: "Moby", album: "Play" }), "grid"))).toBe("<div>Moby</div>"));
  it("musique sans album : seulement l'artiste", () => expect(html(renderCellSubtitle(el({ artist: "Moby" }), "small"))).toBe("<div>Moby</div>"));
  it("grid : album masqué sur mobile", () => {
    const out = html(renderCellSubtitle(el({ artist: "Moby", album: "Play" }), "grid"));
    expect(out).toContain('<span class="hidden md:inline"> ● </span>');
    expect(out).toContain('class="hidden md:inline italic opacity-80"');
  });
  it("small : album toujours visible", () => {
    const out = html(renderCellSubtitle(el({ artist: "Moby", album: "Play" }), "small"));
    expect(out).toContain("<span> ● </span>");
    expect(out).toContain('<span class="italic opacity-80">Play</span>');
  });
  it("list : séparateur collé au texte", () => {
    const out = html(renderCellSubtitle(el({ artist: "Moby", album: "Play" }), "list"));
    expect(out).toBe('<div>Moby ●<span class="italic opacity-80"> Play</span></div>');
  });
});
