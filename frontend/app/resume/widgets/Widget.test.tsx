import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Widget, { type LayoutKey } from "./Widget";

const L = (key: string) => <div data-testid={`layout-${key}`}>{key}</div>;
const layouts = (...keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, L(k)])) as Partial<Record<LayoutKey, React.JSX.Element>>;

const shown = () => screen.queryByTestId(/^layout-/)?.textContent ?? null;

describe("Widget – correspondance exacte", () => {
  it("rend le layout correspondant exactement à w x h", () => {
    render(<Widget w={2} h={1} layouts={layouts("1x1", "2x1", "3x1")} />);
    expect(shown()).toBe("2x1");
  });

  it("rend uniquement le layout choisi", () => {
    render(<Widget w={3} h={1} layouts={layouts("1x1", "2x1", "3x1")} />);
    expect(screen.getAllByTestId(/^layout-/)).toHaveLength(1);
  });

  it("préfère le layout exact même pour un grand format", () => {
    render(<Widget w={2} h={2} layouts={layouts("1x1", "2x2", "3x3")} />);
    expect(shown()).toBe("2x2");
  });

  it("gère un layout exotique exact (4x4)", () => {
    render(<Widget w={4} h={4} layouts={layouts("4x4", "1x1")} />);
    expect(shown()).toBe("4x4");
  });
});

describe("Widget – repli des grands formats", () => {
  it("2x3 sans correspondance : choisit 3x3 en priorité", () => {
    render(<Widget w={2} h={3} layouts={layouts("1x1", "2x2", "3x3")} />);
    expect(shown()).toBe("3x3");
  });

  it("4x4 sans correspondance : 3x3 puis 2x2 puis 1x1", () => {
    const { unmount } = render(<Widget w={4} h={4} layouts={layouts("1x1", "2x2", "3x3")} />);
    expect(shown()).toBe("3x3");
    unmount();
    const r2 = render(<Widget w={4} h={4} layouts={layouts("1x1", "2x2")} />);
    expect(shown()).toBe("2x2");
    r2.unmount();
    render(<Widget w={4} h={4} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });

  it("2x2 avec uniquement 1x1 : retombe sur 1x1", () => {
    render(<Widget w={2} h={2} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });
});

describe("Widget – repli horizontal", () => {
  it("3x1 sans 3x1 : utilise 2x1", () => {
    render(<Widget w={3} h={1} layouts={layouts("1x1", "2x1")} />);
    expect(shown()).toBe("2x1");
  });

  it("3x1 sans 3x1 ni 2x1 : utilise 1x1", () => {
    render(<Widget w={3} h={1} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });

  it("4x1 avec seulement 2x1 et 1x1 : saute à 1x1 (seul w-1 est testé)", () => {
    render(<Widget w={4} h={1} layouts={layouts("1x1", "2x1")} />);
    expect(shown()).toBe("1x1");
  });
});

describe("Widget – repli vertical", () => {
  it("1x3 sans 1x3 : utilise 1x2", () => {
    render(<Widget w={1} h={3} layouts={layouts("1x1", "1x2")} />);
    expect(shown()).toBe("1x2");
  });

  it("1x3 sans 1x3 ni 1x2 : utilise 1x1", () => {
    render(<Widget w={1} h={3} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });

  it("1x2 sans 1x2 : utilise 1x1", () => {
    render(<Widget w={1} h={2} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });
});

describe("Widget – cas limites et placeholder", () => {
  it("affiche un placeholder quand aucun layout n'est fourni", () => {
    const { container } = render(<Widget w={1} h={1} layouts={{}} />);
    expect(shown()).toBeNull();
    const ph = container.firstElementChild as HTMLElement;
    expect(ph).toBeInTheDocument();
    expect(ph.className).toContain("bg-neutral-900/50");
    expect(ph).toBeEmptyDOMElement();
  });

  it("affiche le placeholder pour un format inconnu sans 1x1", () => {
    const { container } = render(<Widget w={2} h={1} layouts={layouts("3x1")} />);
    expect(container.firstElementChild?.className).toContain("bg-neutral-900/50");
  });

  it("format carré 1x1 absent mais autres présents : placeholder", () => {
    const { container } = render(<Widget w={1} h={1} layouts={layouts("2x2")} />);
    expect(shown()).toBeNull();
    expect(container.firstElementChild?.className).toContain("bg-neutral-900/50");
  });

  it("w = h = 0 ne plante pas et retombe sur 1x1 ou le placeholder", () => {
    render(<Widget w={0} h={0} layouts={layouts("1x1")} />);
    expect(shown()).toBe("1x1");
  });

  it("dimensions négatives : pas de plantage", () => {
    const { container } = render(<Widget w={-1} h={-1} layouts={{}} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("met à jour le rendu quand w/h changent", () => {
    const ls = layouts("1x1", "2x1");
    const { rerender } = render(<Widget w={1} h={1} layouts={ls} />);
    expect(shown()).toBe("1x1");
    rerender(<Widget w={2} h={1} layouts={ls} />);
    expect(shown()).toBe("2x1");
  });
});
