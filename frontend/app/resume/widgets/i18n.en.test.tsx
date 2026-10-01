/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BioSettings, BioWidget } from "./atomic/BioWidget";
import { BackgroundSettings } from "./atomic/BackgroundWidget";
import { ProfilePictureSettings, ProfilePictureWidget } from "./atomic/ProfilePictureWidget";
import { UsernameSettings } from "./atomic/UsernameWidget";
import { StreamsSettings, StreamsWidget } from "./stats/StreamsWidget";
import { MinutesSettings } from "./stats/MinutesWidget";
import { DistinctAlbumsSettings } from "./stats/DistinctAlbumsWidget";
import { TopFiveWidget } from "./TopFiveWidget";
import { formatNumber } from "./stats/utils";

vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.en, language: "en", changeLanguage: vi.fn() }) };
});

const noop = vi.fn();

describe("panneaux de réglages en anglais", () => {
  it("Username", () => {
    render(<UsernameSettings settings={{}} onChange={noop} />);
    for (const txt of ["Text color", "ITALIC", "UPPERCASE", "Horizontal alignment", "Vertical alignment", "Left", "Center", "Right", "Top", "Middle", "Bottom"])
      expect(screen.getByText(txt)).toBeInTheDocument();
    expect(screen.queryByText("Gauche")).toBeNull();
  });

  it("Background (libellés et aria-label)", () => {
    render(<BackgroundSettings settings={{}} onChange={noop} />);
    expect(screen.getByText("Ambient effects")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Blur intensity" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Image opacity" })).toBeInTheDocument();
    expect(screen.getByText("Finish")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fade to black (bottom)" })).toBeInTheDocument();
  });

  it("Photo de profil", () => {
    render(<ProfilePictureSettings settings={{}} onChange={noop} />);
    expect(screen.getByRole("button", { name: "Rounded photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MyStats border" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Image zoom" })).toBeInTheDocument();
  });

  it("alt de l'avatar par défaut", () => {
    render(<ProfilePictureWidget w={1} h={1} user={{ avatar: "/a.png" } as any} settings={{}} />);
    expect(screen.getByRole("img", { name: "Avatar" })).toBeInTheDocument();
  });

  it("Bio : réglages et textes de repli", () => {
    render(<BioSettings settings={{}} onChange={noop} />);
    expect(screen.getByText("Reading size")).toBeInTheDocument();
    expect(screen.getByTitle("Size XS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: '"Quote" style' })).toBeInTheDocument();
    render(<BioWidget w={1} h={1} bio="" settings={{}} />);
    expect(screen.getByText("No bio available")).toBeInTheDocument();
    render(<BioWidget w={2} h={2} bio="" settings={{}} />);
    expect(screen.getByText("Share your musical universe here...")).toBeInTheDocument();
  });

  it.each([
    ["Streams", StreamsSettings, "Accent color"],
    ["Minutes", MinutesSettings, "Accent color"],
    ["Albums", DistinctAlbumsSettings, "Color"],
  ] as const)("stats %s", (_n, Settings, color) => {
    render(<Settings settings={{}} onChange={noop} />);
    expect(screen.getByText(color)).toBeInTheDocument();
    expect(screen.getByText("Widget title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show icon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shorten \(1\.2M\)/ })).toBeInTheDocument();
  });

  it("libellé par défaut du widget et nombres en locale anglaise", () => {
    render(<StreamsWidget w={2} h={1} streams={1234567} settings={{}} />);
    expect(screen.getByText("Streams")).toBeInTheDocument();
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("TopFive 3x3 : titre et streams", () => {
    const data = [1, 2].map((n) => ({ name: `Item ${n}`, minutes: n, rating: n, streams: n * 1234567, image: "i.png" })) as any;
    const { container } = render(<TopFiveWidget w={3} h={3} type="tracks" data={data} />);
    const root = within(container);
    expect(root.getByText("Undisputed #1 tracks")).toBeInTheDocument();
    expect(root.getByText("1,234,567 streams")).toBeInTheDocument();
    expect(root.getByText("2,469,134 streams")).toBeInTheDocument();
  });
});

describe("formatNumber avec locale", () => {
  it("utilise la locale fournie", () => {
    expect(formatNumber(1234567, false, "en-US")).toBe("1,234,567");
    expect(formatNumber(1234567, false, "fr-FR")).toBe("1\u202f234\u202f567");
  });
  it("garde fr-FR par défaut", () => {
    expect(formatNumber(1234567, false)).toBe(formatNumber(1234567, false, "fr-FR"));
  });
});
