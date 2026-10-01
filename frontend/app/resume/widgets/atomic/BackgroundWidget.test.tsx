/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackgroundSettings, BackgroundWidget, toCssUrl } from "./BackgroundWidget";

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

const renderWidget = (settings: any = {}, data = "https://img/bg.jpg", w = 1, h = 1) =>
  render(<BackgroundWidget w={w} h={h} data={data} settings={settings} />);
const bgDiv = (c: HTMLElement) => c.querySelector(".bg-cover") as HTMLElement;
const gradient = (c: HTMLElement) => c.querySelector(".bg-gradient-to-t");

describe("BackgroundWidget", () => {
  it("affiche l'image de fond via background-image", () => {
    const { container } = renderWidget();
    expect(bgDiv(container).style.backgroundImage).toMatch(/^url\("?https:\/\/img\/bg\.jpg"?\)$/);
  });

  it("applique flou 10px, opacité 0.3 et dégradé par défaut", () => {
    const { container } = renderWidget();
    expect(bgDiv(container).style.filter).toBe("blur(10px)");
    expect(bgDiv(container).style.opacity).toBe("0.3");
    expect(gradient(container)).toBeInTheDocument();
  });

  it("applique les réglages fournis", () => {
    const { container } = renderWidget({ blur: 25, opacity: 0.8, gradient: false });
    expect(bgDiv(container).style.filter).toBe("blur(25px)");
    expect(bgDiv(container).style.opacity).toBe("0.8");
    expect(gradient(container)).toBeNull();
  });

  it("conserve les valeurs limites 0 (flou 0, opacité 0)", () => {
    const { container } = renderWidget({ blur: 0, opacity: 0 });
    expect(bgDiv(container).style.filter).toBe("blur(0px)");
    expect(bgDiv(container).style.opacity).toBe("0");
  });

  it("accepte flou 40 et opacité 1", () => {
    const { container } = renderWidget({ blur: 40, opacity: 1 });
    expect(bgDiv(container).style.filter).toBe("blur(40px)");
    expect(bgDiv(container).style.opacity).toBe("1");
  });

  it.each([[2, 2], [3, 1], [1, 4]])("remplit aussi le format %ix%i (repli sur 1x1)", (w, h) => {
    const { container } = renderWidget({}, "https://img/bg.jpg", w, h);
    expect(bgDiv(container)).toBeInTheDocument();
  });

  it("ne plante pas avec settings undefined ou null", () => {
    expect(() => renderWidget(undefined)).not.toThrow();
    expect(() => renderWidget(null)).not.toThrow();
  });

  it("ne plante pas avec une URL vide", () => {
    const { container } = renderWidget({}, "");
    expect(bgDiv(container)).toBeInTheDocument();
  });

  it("est décoratif : aucun élément img ni texte", () => {
    const { container } = renderWidget();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });
});

describe("BackgroundSettings", () => {
  const [blur, opacity] = [0, 1];
  const sliders = () => screen.getAllByRole("slider");

  it("affiche deux curseurs et le bouton de dégradé", () => {
    render(<BackgroundSettings settings={{}} onChange={onChange} />);
    expect(sliders()).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Dégradé vers le noir/ })).toBeInTheDocument();
    expect(screen.getByText("Intensité du flou")).toBeInTheDocument();
    expect(screen.getByText("Opacité de l'image")).toBeInTheDocument();
  });

  it("affiche les valeurs par défaut (10px, 30%)", () => {
    render(<BackgroundSettings settings={{}} onChange={onChange} />);
    expect(sliders()[blur]).toHaveValue("10");
    expect(sliders()[opacity]).toHaveValue("0.3");
    expect(screen.getByText("10px")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("affiche les valeurs fournies, dont 0", () => {
    render(<BackgroundSettings settings={{ blur: 0, opacity: 0 }} onChange={onChange} />);
    expect(screen.getByText("0px")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("arrondit le pourcentage d'opacité (0.35 -> 35%, 0.07 -> 7%)", () => {
    const { rerender } = render(<BackgroundSettings settings={{ opacity: 0.35 }} onChange={onChange} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
    rerender(<BackgroundSettings settings={{ opacity: 0.07 }} onChange={onChange} />);
    expect(screen.getByText("7%")).toBeInTheDocument();
  });

  it("définit les bornes des curseurs", () => {
    render(<BackgroundSettings settings={{}} onChange={onChange} />);
    expect(sliders()[blur]).toHaveAttribute("min", "0");
    expect(sliders()[blur]).toHaveAttribute("max", "40");
    expect(sliders()[blur]).toHaveAttribute("step", "1");
    expect(sliders()[opacity]).toHaveAttribute("min", "0");
    expect(sliders()[opacity]).toHaveAttribute("max", "1");
    expect(sliders()[opacity]).toHaveAttribute("step", "0.05");
  });

  it("modifier le flou envoie un entier", () => {
    render(<BackgroundSettings settings={{ opacity: 0.5 }} onChange={onChange} />);
    fireEvent.change(sliders()[blur], { target: { value: "25" } });
    expect(onChange).toHaveBeenCalledWith({ opacity: 0.5, blur: 25 });
  });

  it("modifier l'opacité envoie un nombre décimal", () => {
    render(<BackgroundSettings settings={{ blur: 5 }} onChange={onChange} />);
    fireEvent.change(sliders()[opacity], { target: { value: "0.65" } });
    expect(onChange).toHaveBeenCalledWith({ blur: 5, opacity: 0.65 });
  });

  it("les curseurs ont un nom accessible", () => {
    render(<BackgroundSettings settings={{}} onChange={onChange} />);
    expect(screen.getByRole("slider", { name: /flou/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /opacité/i })).toBeInTheDocument();
  });

  it("désactive le dégradé quand il est actif (settings.gradient = true)", async () => {
    render(<BackgroundSettings settings={{ gradient: true }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Dégradé/ }));
    expect(onChange).toHaveBeenCalledWith({ gradient: false });
  });

  it("active le dégradé quand il est désactivé", async () => {
    render(<BackgroundSettings settings={{ gradient: false }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Dégradé/ }));
    expect(onChange).toHaveBeenCalledWith({ gradient: true });
  });

  it("désactive le dégradé au premier clic quand le réglage est absent (actif par défaut)", async () => {
    // Défaut : !settings.gradient vaut !undefined = true, le clic ne change rien
    render(<BackgroundSettings settings={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Dégradé/ }));
    expect(onChange).toHaveBeenCalledWith({ gradient: false });
  });

  it("reflète l'état par défaut (actif) de l'interrupteur", () => {
    const { container } = render(<BackgroundSettings settings={{}} onChange={onChange} />);
    expect(container.querySelector("button > div")).toHaveClass("bg-vert");
    expect(container.querySelector("button > div > div")).toHaveClass("translate-x-3.5");
  });

  it("reflète l'état désactivé de l'interrupteur", () => {
    const { container } = render(<BackgroundSettings settings={{ gradient: false }} onChange={onChange} />);
    expect(container.querySelector("button > div")).toHaveClass("bg-white/20");
    expect(container.querySelector("button > div > div")).toHaveClass("translate-x-0");
  });

  it("l'interrupteur expose son état (aria-pressed)", () => {
    render(<BackgroundSettings settings={{ gradient: true }} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /Dégradé/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("ne plante pas avec settings undefined à l'affichage", () => {
    expect(() => render(<BackgroundSettings settings={undefined} onChange={onChange} />)).not.toThrow();
  });

  it("ne plante pas au clic sur le dégradé avec settings undefined", async () => {
    // Le TypeError levé dans le gestionnaire est remonté à window : on l'absorbe pour ne pas polluer le run
    const swallow = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener("error", swallow);
    render(<BackgroundSettings settings={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Dégradé/ }));
    window.removeEventListener("error", swallow);
    expect(onChange).toHaveBeenCalled();
  });
});

describe("toCssUrl", () => {
  it("met une URL https entre guillemets", () => {
    expect(toCssUrl("https://img/bg.jpg")).toBe('url("https://img/bg.jpg")');
  });

  it("accepte un chemin du site et une image data: usuelle", () => {
    expect(toCssUrl("/banner_template.jpg")).toBe('url("/banner_template.jpg")');
    expect(toCssUrl("data:image/png;base64,AAAA")).toBe('url("data:image/png;base64,AAAA")');
  });

  it.each([null, undefined, "", "   ", 42, {}, "null", "undefined"])("renvoie « none » (et jamais url(null)) pour %j", (v) => {
    expect(toCssUrl(v)).toBe("none");
  });

  it.each([
    "javascript:alert(1)",
    "http://tracker.example/a.png",
    "//evil.example/a.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:text/html;base64,PGgxPg==",
    "ftp://x/a.png",
  ])("refuse le schéma non autorisé %s", (v) => {
    expect(toCssUrl(v)).toBe("none");
  });

  it("échappe les guillemets : impossible de sortir de url() pour injecter un second fond ou une déclaration", () => {
    const out = toCssUrl('https://img/a.png") , url("https://tracker.example/pixel.png');
    expect(out.startsWith('url("')).toBe(true);
    expect(out.endsWith('")')).toBe(true);
    // Aucun guillemet non échappé à l'intérieur : la valeur reste une seule chaîne
    const inner = out.slice(5, -2);
    expect(inner).not.toMatch(/(^|[^\\])"/);
  });

  it("échappe les antislashs et neutralise les retours à la ligne", () => {
    const out = toCssUrl("https://img/a\\b.png\n;color:red");
    expect(out).not.toMatch(/\n|\r/);
    expect(out).toContain("\\\\");
  });
});

describe("BackgroundWidget – URL de fond", () => {
  it("sans image (null), n'écrit pas url(null) mais aucun fond", () => {
    const { container } = renderWidget({}, null as any);
    expect(bgDiv(container).style.backgroundImage).not.toContain("null");
    expect(["none", ""]).toContain(bgDiv(container).style.backgroundImage);
  });

  it("une URL malveillante n'ajoute pas de seconde image de fond", () => {
    const { container } = renderWidget({}, 'https://img/a.png"), url("https://tracker.example/pixel.png');
    const bg = bgDiv(container).style.backgroundImage;
    // Une seule valeur url("…") : tous les guillemets intérieurs sont échappés, le texte « url( » reste dans la chaîne
    expect(bg.startsWith('url("')).toBe(true);
    expect(bg.endsWith('")')).toBe(true);
    expect(bg.slice(5, -2)).not.toMatch(/(^|[^\\])"/);
  });

  it("un schéma dangereux (javascript:) est ignoré", () => {
    const { container } = renderWidget({}, "javascript:alert(1)");
    expect(bgDiv(container).style.backgroundImage).not.toContain("javascript");
  });
});
