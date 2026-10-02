import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatBlocks from "./StatBlock";
import type { DataInfo } from "@/app/data/DataInfos";

const styles = { STAT_BLOCK: "blk", STAT_VALUE: (a: boolean) => (a ? "val on" : "val"), STAT_LABEL: "lbl" };
const el = (o: Partial<DataInfo> = {}): DataInfo => ({ play_count: 1500, total_minutes: 90.6, engagement: 42.5, rating: 4, type: "track", ...o });
const renderIt = (element: DataInfo, sort = "play_count") =>
  render(<StatBlocks element={element} sort={sort} locale="en-US" unitStreams="streams" unitMinutes="min" styles={styles} />);

describe("StatBlocks", () => {
  it("affiche les trois valeurs formatées avec leurs unités", () => {
    renderIt(el());
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.getByText("42.5")).toBeInTheDocument();
    expect(screen.getByText("streams")).toBeInTheDocument();
    expect(screen.getByText("min")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("met en avant la colonne triée", () => {
    renderIt(el(), "total_minutes");
    expect(screen.getByText("91").className).toBe("val on");
    expect(screen.getByText("1,500").className).toBe("val");
  });

  it("valeur invalide : « - » sans unité", () => {
    const { container } = renderIt(el({ play_count: NaN, total_minutes: NaN, engagement: NaN }));
    expect(screen.getAllByText("-")).toHaveLength(3);
    expect(container.querySelectorAll(".lbl")).toHaveLength(0);
    expect(container.querySelectorAll(".blk")).toHaveLength(3);
  });
});
