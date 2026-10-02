/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "@/app/services/api";
import { useDashboardData } from "./useDashboardData";
import { INITIAL_STATS } from "./utils";

const h = vi.hoisted(() => ({ getDashboard: vi.fn(), getProfile: vi.fn() }));
vi.mock("@/app/hooks/useProfile", () => ({ useProfile: () => ({ getDashboard: h.getDashboard, getProfile: h.getProfile }) }));

const base = { id: "7", range: "lifetime", offset: 0, customStart: "", customEnd: "" };
const stats = { ...INITIAL_STATS, totalStreams: 12 };

beforeEach(() => {
  h.getDashboard.mockReset().mockResolvedValue(stats);
  h.getProfile.mockReset().mockResolvedValue({ display_name: "Yvan" });
});

describe("useDashboardData", () => {
  it("sans id : rien n'est chargé", () => {
    const { result } = renderHook(() => useDashboardData({ ...base, id: undefined }));
    expect(result.current.loading).toBe(false);
    expect(h.getProfile).not.toHaveBeenCalled();
    expect(h.getDashboard).not.toHaveBeenCalled();
  });

  it("charge profil et stats puis termine le chargement", async () => {
    const { result } = renderHook(() => useDashboardData(base));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.getProfile).toHaveBeenCalledWith("7");
    expect(h.getDashboard).toHaveBeenCalledWith("7", null, null);
    expect(result.current.profile).toEqual({ display_name: "Yvan" });
    expect(result.current.extendedStats.totalStreams).toBe(12);
  });

  it("période personnalisée : bornes en ISO local et exposées au format des inputs", async () => {
    const { result } = renderHook(() => useDashboardData({ ...base, range: "custom", customStart: "2026-03-01", customEnd: "2026-03-05" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.getDashboard).toHaveBeenCalledWith("7", new Date("2026-03-01T00:00:00").toISOString(), new Date("2026-03-05T23:59:59.999").toISOString());
    expect(result.current.startDate).toBe("2026-03-01");
    expect(result.current.endDate).toBe("2026-03-05");
  });

  it("erreur de stats : conservée, puis retry relance seulement les stats", async () => {
    h.getDashboard.mockRejectedValueOnce(new ApiError(500, "x"));
    const { result } = renderHook(() => useDashboardData(base));
    await waitFor(() => expect(result.current.statsError).not.toBeNull());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.statsError).toBeNull());
    await waitFor(() => expect(result.current.extendedStats.totalStreams).toBe(12));
    expect(h.getDashboard).toHaveBeenCalledTimes(2);
    expect(h.getProfile).toHaveBeenCalledTimes(1);
  });

  it("erreur de profil exposée", async () => {
    const err = new ApiError(404, "nf");
    h.getProfile.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useDashboardData(base));
    await waitFor(() => expect(result.current.profileError).toBe(err));
    expect(result.current.profile).toBeNull();
  });
});
