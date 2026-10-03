import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "@/app/services/api";
import { getDateRange } from "@/app/profile/dashboard/[id]/utils";
import { makeDetail } from "./fixtures";
import { resolveRange, useItemDetail } from "./useItemDetail";

const h = vi.hoisted(() => ({ getItemDetail: vi.fn() }));
vi.mock("@/app/hooks/useApiMyDatas", () => ({ useApiMyDatas: () => ({ getItemDetail: h.getItemDetail }) }));

const query = { type: "track" as const, id: "12", range: "lifetime", offset: 0, customStart: "", customEnd: "" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.getItemDetail.mockReset();
  h.getItemDetail.mockResolvedValue(makeDetail());
});

describe("useItemDetail", () => {
  it("charge tout l'historique par défaut (sans borne)", async () => {
    const { result } = renderHook(() => useItemDetail(query));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.getItemDetail).toHaveBeenCalledWith("track", "12", null, null);
    expect(result.current.data?.entity.name).toBe("Nom de l'élément");
    expect(result.current.startDate).toBe("");
  });

  it("transmet les bornes de la période comme le dashboard et expose les dates", async () => {
    const { result } = renderHook(() => useItemDetail({ ...query, range: "year", offset: -1 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const { start, end } = getDateRange("year", -1);
    expect(h.getItemDetail).toHaveBeenCalledWith("track", "12", start, end);
    expect(result.current.startDate).toMatch(/^\d{4}-01-01$/);
    expect(result.current.endDate).toMatch(/^\d{4}-12-31$/);
  });

  it("utilise les bornes saisies pour la période personnalisée", async () => {
    const { result } = renderHook(() => useItemDetail({ ...query, range: "custom", customStart: "2026-02-01", customEnd: "2026-02-10" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.getItemDetail).toHaveBeenCalledWith("track", "12", new Date("2026-02-01T00:00:00").toISOString(), new Date("2026-02-10T23:59:59.999").toISOString());
    expect(result.current.startDate).toBe("2026-02-01");
    expect(result.current.endDate).toBe("2026-02-10");
  });

  it("recharge quand la période change", async () => {
    const { result, rerender } = renderHook((p) => useItemDetail(p), { initialProps: query });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ ...query, range: "month" });
    await waitFor(() => expect(h.getItemDetail).toHaveBeenCalledTimes(2));
  });

  it("n'appelle pas l'API sans identifiant", async () => {
    const { result } = renderHook(() => useItemDetail({ ...query, id: undefined }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.getItemDetail).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it("expose l'erreur (404) puis relance avec retry", async () => {
    h.getItemDetail.mockRejectedValueOnce(new ApiError(404, "Not found"));
    const { result } = renderHook(() => useItemDetail(query));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.data).toBeNull();
    result.current.retry();
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
  });
});

describe("resolveRange", () => {
  it("période personnalisée incomplète : retombe sur la période standard", () => {
    // Horloge figée : getDateRange lit « maintenant », deux appels successifs pourraient sinon différer d'une milliseconde
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
    try {
      expect(resolveRange("custom", 0, "", "")).toEqual(getDateRange("custom", 0));
    } finally {
      vi.useRealTimers();
    }
  });
  it("lifetime : aucune borne", () => {
    expect(resolveRange("lifetime", 0, "", "")).toEqual({ start: null, end: null });
  });
  it("date invalide : borne nulle", () => {
    expect(resolveRange("custom", 0, "nope", "2026-01-01").start).toBeNull();
  });
});
