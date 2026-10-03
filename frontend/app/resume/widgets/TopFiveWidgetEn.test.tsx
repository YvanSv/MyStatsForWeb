import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopFiveWidget } from "./TopFiveWidget";

vi.mock("../../context/languageContext", async () => {
  const { languages } = await import("../../constants/locales/lang");
  return { useLanguage: () => ({ t: languages.en, language: "en", changeLanguage: vi.fn() }) };
});

const items = [1, 2, 3].map((n) => ({ name: `I${n}`, minutes: n * 1234.4, rating: n, streams: n * 1234, image: "" }));

describe("TopFiveWidget (en)", () => {
  it("critères et unités anglais, séparateurs de la locale", () => {
    const { container, rerender } = render(<TopFiveWidget w={3} h={2} type="tracks" data={items} sort="minutes" />);
    expect(screen.getAllByText("Listening time").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("1,234 min");
    rerender(<TopFiveWidget w={1} h={2} type="tracks" data={items} sort="minutes" />);
    expect(screen.getAllByText("Listening time (min)").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("1.2k");
    expect(container.textContent).not.toMatch(/\d min/);
    rerender(<TopFiveWidget w={3} h={2} type="tracks" data={items} sort="streams" />);
    expect(screen.getAllByText("Streams").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("1,234");
    expect(container.textContent).not.toContain("streams");
    rerender(<TopFiveWidget w={2} h={2} type="tracks" data={items} sort="rating" />);
    expect(screen.getAllByText("Rating").length).toBeGreaterThan(0);
  });

  it("pastille « Listening time » jamais tronquée en 3x3, 3x2 et 2x2 (structure ; largeur à vérifier dans le navigateur)", () => {
    for (const [w, h] of [[3, 3], [3, 2], [2, 2]]) {
      const { unmount } = render(<TopFiveWidget w={w} h={h} type="tracks" data={items} sort="minutes" />);
      const pill = screen.getAllByText(w === 3 ? "Listening time" : "Listening time (min)")[0];
      expect(pill.className).toContain("whitespace-nowrap");
      expect(pill.className).not.toContain("truncate");
      unmount();
    }
  });

  it("3x3 : nom du n°1 sur 2 lignes", () => {
    render(<TopFiveWidget w={3} h={3} type="tracks" data={items} />);
    const h3 = screen.getByRole("heading", { name: "I1" });
    expect(h3.className).toContain("line-clamp-2");
    expect(h3.className).not.toContain("truncate");
  });
});
