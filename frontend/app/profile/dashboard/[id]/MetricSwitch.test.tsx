import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricSwitch } from "./MetricSwitch";

const lang = vi.hoisted(() => ({ current: "fr" as "fr" | "en" }));
vi.mock("@/app/context/languageContext", async () => {
  const { languages } = await import("@/app/constants/locales/lang");
  return { useLanguage: () => ({ t: languages[lang.current], language: lang.current, changeLanguage: vi.fn() }) };
});

const onChange = vi.fn();

beforeEach(() => {
  lang.current = "fr";
  onChange.mockReset();
});

describe("MetricSwitch", () => {
  it("affiche deux boutons : minutes puis streams", () => {
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("met en évidence le bouton minutes quand la valeur est minutes", () => {
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    const [minutes, streams] = screen.getAllByRole("button");
    expect(minutes.className).toContain("bg-vert");
    expect(streams.className).not.toContain("bg-vert");
  });

  it("met en évidence le bouton streams quand la valeur est streams", () => {
    render(<MetricSwitch value="streams" onChange={onChange} />);
    const [minutes, streams] = screen.getAllByRole("button");
    expect(streams.className).toContain("bg-vert");
    expect(minutes.className).not.toContain("bg-vert");
  });

  it("un clic sur le premier bouton demande 'minutes'", async () => {
    const user = userEvent.setup();
    render(<MetricSwitch value="streams" onChange={onChange} />);
    await user.click(screen.getAllByRole("button")[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("minutes");
  });

  it("un clic sur le second bouton demande 'streams'", async () => {
    const user = userEvent.setup();
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    await user.click(screen.getAllByRole("button")[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("streams");
  });

  it("recliquer sur la valeur active notifie quand même le parent", async () => {
    const user = userEvent.setup();
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    await user.click(screen.getAllByRole("button")[0]);
    expect(onChange).toHaveBeenCalledWith("minutes");
  });

  it("est utilisable au clavier (Tab + Entrée / Espace)", async () => {
    const user = userEvent.setup();
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("minutes");
    await user.tab();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("streams");
  });

  it("chaque bouton affiche une icône svg", () => {
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    for (const b of screen.getAllByRole("button")) expect(b.querySelector("svg")).not.toBeNull();
  });

  it("les boutons ont un nom accessible (icônes seules sinon)", () => {
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveAccessibleName();
    }
  });

  it("expose l'état sélectionné via aria-pressed", () => {
    render(<MetricSwitch value="streams" onChange={onChange} />);
    const [minutes, streams] = screen.getAllByRole("button");
    expect(minutes).toHaveAttribute("aria-pressed", "false");
    expect(streams).toHaveAttribute("aria-pressed", "true");
  });
});

describe("MetricSwitch - langue", () => {
  it("noms accessibles en français", () => {
    lang.current = "fr";
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Minutes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Streams" })).toBeInTheDocument();
  });

  it("noms accessibles issus du dictionnaire anglais", async () => {
    lang.current = "en";
    const { languages } = await import("@/app/constants/locales/lang");
    render(<MetricSwitch value="minutes" onChange={onChange} />);
    expect(screen.getByRole("button", { name: languages.en.dashboard.metricMinutes })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: languages.en.dashboard.metricStreams })).toBeInTheDocument();
  });
});
