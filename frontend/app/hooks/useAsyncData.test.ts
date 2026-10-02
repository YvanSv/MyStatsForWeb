import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncData } from "./useAsyncData";

beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe("useAsyncData", () => {
  it("charge puis expose la donnée", async () => {
    const { result } = renderHook(() => useAsyncData(() => Promise.resolve(42), []));
    expect(result.current).toMatchObject({ data: null, loading: true, error: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: 42, error: null });
  });

  it("expose l'erreur, loggue et laisse data à null", async () => {
    const err = new Error("boom");
    const { result } = renderHook(() => useAsyncData(() => Promise.reject(err), []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ data: null, error: err });
    expect(console.error).toHaveBeenCalled();
  });

  it("retry relance le chargement", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useAsyncData(fn, []));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe("ok"));
    expect(result.current.error).toBeNull();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("ignore le résultat après démontage", async () => {
    const d = deferred<string>();
    const { result, unmount } = renderHook(() => useAsyncData(() => d.promise, []));
    unmount();
    await act(async () => { d.resolve("tard"); await d.promise; });
    expect(result.current.data).toBeNull();
  });

  it("ignore l'ancien résultat quand les dépendances changent", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const { result, rerender } = renderHook(({ id }) => useAsyncData(() => (id === 1 ? first.promise : second.promise), [id]), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await act(async () => { second.resolve("deux"); await second.promise; });
    await act(async () => { first.resolve("un"); await first.promise; });
    expect(result.current.data).toBe("deux");
  });
});
