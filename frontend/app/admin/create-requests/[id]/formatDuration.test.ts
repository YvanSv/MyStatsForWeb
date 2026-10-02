import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it.each([[undefined], [0], [NaN], [Infinity]])("« — » pour %s", (v) => expect(formatDuration(v as any)).toBe("—"));
  it.each([[1000, "0:01"], [61000, "1:01"], [210000, "3:30"], [3600000, "60:00"]])("%i ms -> %s", (ms, out) => expect(formatDuration(ms)).toBe(out));
  it("arrondit à la seconde avant de découper (59,5 s -> 1:00)", () => expect(formatDuration(59500)).toBe("1:00"));
});
