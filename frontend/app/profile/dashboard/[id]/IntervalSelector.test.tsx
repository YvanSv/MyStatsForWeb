import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { languages } from "@/app/constants/locales/lang";
import IntervalsSelector from "./IntervalSelector";

const dict = languages.fr.dashboard;
const onIntervalChange = vi.fn();

vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages.fr, language: "fr", changeLanguage: vi.fn() }) };
});
// Animations remplacées par de simples éléments : pas d'attente de transition de sortie
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className} data-testid="panel">{children}</div>
    ),
  },
}));

beforeEach(() => {
  onIntervalChange.mockReset();
});

const labels = [dict.today, dict.week, dict.month, dict.season, dict.sixMonths, dict.year, dict.lastMonth, dict.custom];
const toggle = () => screen.getAllByRole("button")[0];

describe("IntervalsSelector", () => {
  it("est déplié par défaut et affiche tous les intervalles", () => {
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    for (const label of labels) expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    // bascule + 8 intervalles (dont lifetime en icône et la période personnalisée)
    expect(screen.getAllByRole("button")).toHaveLength(10);
  });

  it("affiche l'icône infini pour lifetime", () => {
    const { container } = render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    expect(container.querySelector("svg.lucide-infinity")).not.toBeNull();
  });

  it.each([
    [dict.today, "today"],
    [dict.week, "week"],
    [dict.month, "month"],
    [dict.season, "season"],
    [dict.sixMonths, "6m"],
    [dict.year, "year"],
    [dict.lastMonth, "1m"],
    [dict.custom, "custom"],
  ])("un clic sur %s notifie l'intervalle %s", async (label, id) => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(onIntervalChange).toHaveBeenCalledTimes(1);
    expect(onIntervalChange).toHaveBeenCalledWith(id);
  });

  it("un clic sur l'icône infini notifie lifetime", async () => {
    const user = userEvent.setup();
    const { container } = render(<IntervalsSelector range="today" onIntervalChange={onIntervalChange} />);
    await user.click(container.querySelector("svg.lucide-infinity")!.closest("button")!);
    expect(onIntervalChange).toHaveBeenCalledWith("lifetime");
  });

  it("met en évidence uniquement l'intervalle actif", () => {
    render(<IntervalsSelector range="season" onIntervalChange={onIntervalChange} />);
    const active = screen.getAllByRole("button").filter((b) => b.className.includes("bg-vert"));
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent(dict.season);
  });

  it("met en évidence lifetime quand c'est l'intervalle actif", () => {
    const { container } = render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    expect(container.querySelector("svg.lucide-infinity")!.closest("button")!.className).toContain("bg-vert");
  });

  it("met en évidence la période personnalisée quand elle est active", () => {
    render(<IntervalsSelector range="custom" onIntervalChange={onIntervalChange} />);
    const active = screen.getAllByRole("button").filter((b) => b.className.includes("bg-vert"));
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent(dict.custom);
  });

  it("aucun intervalle n'est actif pour un intervalle inconnu", () => {
    render(<IntervalsSelector range="inconnu" onIntervalChange={onIntervalChange} />);
    expect(screen.getAllByRole("button").filter((b) => b.className.includes("bg-vert"))).toHaveLength(0);
  });

  it("le bouton de bascule affiche '>' quand le panneau est ouvert", () => {
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    expect(toggle()).toHaveTextContent(">");
  });

  it("replier masque les intervalles et affiche le libellé Filtres", async () => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    await user.click(toggle());
    expect(screen.queryByRole("button", { name: dict.week })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(toggle()).toHaveTextContent(`< ${dict.filtersBtn}`);
  });

  it("déplier à nouveau réaffiche les intervalles", async () => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    await user.click(toggle());
    await user.click(toggle());
    expect(screen.getByRole("button", { name: dict.week })).toBeInTheDocument();
    expect(toggle()).toHaveTextContent(">");
  });

  it("replier ne notifie aucun changement d'intervalle", async () => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    await user.click(toggle());
    expect(onIntervalChange).not.toHaveBeenCalled();
  });

  it("garde l'intervalle actif après repli/dépli", async () => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="year" onIntervalChange={onIntervalChange} />);
    await user.click(toggle());
    await user.click(toggle());
    expect(screen.getByRole("button", { name: dict.year }).className).toContain("bg-vert");
  });

  it("est utilisable au clavier", async () => {
    const user = userEvent.setup();
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onIntervalChange).toHaveBeenCalledWith("today");
  });

  it("le bouton de bascule expose son état via aria-expanded", () => {
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("le bouton de bascule et le bouton lifetime ont un nom accessible", () => {
    render(<IntervalsSelector range="lifetime" onIntervalChange={onIntervalChange} />);
    for (const b of screen.getAllByRole("button")) expect(b).toHaveAccessibleName();
  });

  it("l'intervalle actif expose aria-pressed", () => {
    render(<IntervalsSelector range="week" onIntervalChange={onIntervalChange} />);
    expect(screen.getByRole("button", { name: dict.week })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: dict.month })).toHaveAttribute("aria-pressed", "false");
  });
});
