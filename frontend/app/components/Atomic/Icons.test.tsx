import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CameraIcon, CheckIcon, CrossIcon, FileIcon, QuestionIcon, SpotifyIcon, UploadIcon } from "./Icons";

describe("Icons", () => {
  it.each([
    ["SpotifyIcon", SpotifyIcon, "24"], ["CheckIcon", CheckIcon, "14"], ["CrossIcon", CrossIcon, "14"],
    ["CameraIcon", CameraIcon, "24"], ["UploadIcon", UploadIcon, "24"], ["FileIcon", FileIcon, "24"], ["QuestionIcon", QuestionIcon, "24"],
  ])("%s : taille par défaut", (_n, Icon, size) => {
    const svg = render(<Icon />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", size);
    expect(svg).toHaveAttribute("height", size);
  });

  it("la taille est configurable", () => {
    const svg = render(<SpotifyIcon size={20} />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "20");
    expect(svg.querySelector("path")).toBeInTheDocument();
  });
});
