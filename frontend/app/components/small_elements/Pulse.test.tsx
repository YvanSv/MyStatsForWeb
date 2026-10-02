import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Pulse from "./Pulse";

describe("Pulse", () => {
  it("applique le style pulsant et les classes passées", () => {
    const { container } = render(<Pulse className="h-4 w-10" />);
    expect((container.firstChild as HTMLElement).className).toBe("animate-pulse bg-white/5 rounded-lg h-4 w-10");
  });
  it("fonctionne sans className", () => {
    const { container } = render(<Pulse />);
    expect((container.firstChild as HTMLElement).className).toContain("animate-pulse");
  });
});
