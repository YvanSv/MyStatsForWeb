import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { useImageUpload } from "./useImageUpload";
import { TOAST_ERROR_OPTIONS } from "@/app/constants/ui";
import { MAX_IMAGE_BYTES } from "@/app/constants/validation";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const messages = { errorImageType: "type", errorWeight: "poids" };
const event = (file?: File) => ({ target: { files: file ? [file] : [], value: "x" } }) as unknown as React.ChangeEvent<HTMLInputElement>;

describe("useImageUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse un type non autorisé", () => {
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useImageUpload(onLoaded, messages));
    const e = event(new File(["x"], "a.svg", { type: "image/svg+xml" }));
    result.current("avatar_url")(e);
    expect(toast.error).toHaveBeenCalledWith("type", TOAST_ERROR_OPTIONS);
    expect(e.target.value).toBe("");
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("refuse une image trop lourde", () => {
    const { result } = renderHook(() => useImageUpload(vi.fn(), messages));
    const file = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: MAX_IMAGE_BYTES + 1 });
    result.current("banner_url")(event(file));
    expect(toast.error).toHaveBeenCalledWith("poids", TOAST_ERROR_OPTIONS);
  });

  it("lit l'image et la transmet avec la clé demandée", async () => {
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useImageUpload(onLoaded, messages));
    result.current("banner_url")(event(new File(["x"], "a.png", { type: "image/png" })));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith("banner_url", expect.stringMatching(/^data:image\/png/)));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ignore l'absence de fichier", () => {
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useImageUpload(onLoaded, messages));
    result.current("avatar_url")(event());
    expect(onLoaded).not.toHaveBeenCalled();
  });
});
