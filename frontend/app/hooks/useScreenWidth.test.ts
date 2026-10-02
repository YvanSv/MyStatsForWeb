import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DESKTOP_BREAKPOINT } from "../constants/ui";
import { isMobileViewport, useScreenWidth } from "./useScreenWidth";

const original = window.innerWidth;
const setWidth = (w: number) => { Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: w }); };
afterEach(() => setWidth(original));

describe("isMobileViewport", () => {
  it("vrai sous le breakpoint, faux à partir du breakpoint", () => {
    setWidth(DESKTOP_BREAKPOINT - 1);
    expect(isMobileViewport()).toBe(true);
    setWidth(DESKTOP_BREAKPOINT);
    expect(isMobileViewport()).toBe(false);
  });
});

describe("useScreenWidth", () => {
  it("mesure la largeur réelle dès le montage", () => {
    setWidth(500);
    const { result } = renderHook(() => useScreenWidth());
    expect(result.current).toBe(500);
  });

  it("suit le redimensionnement et se désabonne au démontage", () => {
    setWidth(900);
    const { result, unmount } = renderHook(() => useScreenWidth());
    act(() => { setWidth(400); window.dispatchEvent(new Event("resize")); });
    expect(result.current).toBe(400);
    unmount();
    act(() => { setWidth(300); window.dispatchEvent(new Event("resize")); });
    expect(result.current).toBe(400);
  });
});
