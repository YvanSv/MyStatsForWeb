import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomLabel, ShortenFilter, ShowIconFilter } from "./common_filters";

const update = vi.fn();

beforeEach(() => {
  update.mockReset();
});

describe.each([
  ["ShortenFilter", ShortenFilter, /Abréger/, "shorten"],
  ["ShowIconFilter", ShowIconFilter, /Afficher l'icône/, "showIcon"],
] as const)("%s", (_name, Component, label, key) => {
  const knob = (c: HTMLElement) => c.querySelector("button > div > div") as HTMLElement;

  it("rend un bouton avec son libellé comme nom accessible", () => {
    render(<Component update={update} settings={{}} />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("active l'option quand elle est désactivée", async () => {
    render(<Component update={update} settings={{ [key]: false }} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(key, true);
  });

  it("désactive l'option quand elle est activée", async () => {
    render(<Component update={update} settings={{ [key]: true }} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(update).toHaveBeenCalledWith(key, false);
  });

  it("traite une valeur absente comme désactivée", async () => {
    render(<Component update={update} settings={{}} />);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(update).toHaveBeenCalledWith(key, true);
  });

  it("est activable au clavier (Entrée et Espace)", async () => {
    const user = userEvent.setup();
    render(<Component update={update} settings={{}} />);
    await user.tab();
    expect(screen.getByRole("button", { name: label })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("reflète l'état visuel (vert + décalage) quand activé", () => {
    const { container } = render(<Component update={update} settings={{ [key]: true }} />);
    expect(knob(container).parentElement).toHaveClass("bg-vert");
    expect(knob(container)).toHaveClass("translate-x-3");
  });

  it("reflète l'état visuel (gris, sans décalage) quand désactivé", () => {
    const { container } = render(<Component update={update} settings={{ [key]: false }} />);
    expect(knob(container).parentElement).toHaveClass("bg-white/20");
    expect(knob(container)).toHaveClass("translate-x-0");
  });

  it("expose son état aux technologies d'assistance (aria-pressed ou role switch)", () => {
    render(<Component update={update} settings={{ [key]: true }} />);
    const btn = screen.getByRole("button", { name: label });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

describe("CustomLabel", () => {
  it("affiche le champ avec la valeur courante et le libellé « Titre du widget »", () => {
    render(<CustomLabel update={update} settings={{ label: "Streams" }} />);
    expect(screen.getByText("Titre du widget")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Streams");
  });

  it("associe le label au champ (nom accessible « Titre du widget »)", () => {
    render(<CustomLabel update={update} settings={{}} />);
    expect(screen.getByRole("textbox", { name: "Titre du widget" })).toBeInTheDocument();
  });

  it("affiche une valeur vide quand le label est absent ou null", () => {
    const { rerender } = render(<CustomLabel update={update} settings={{}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    rerender(<CustomLabel update={update} settings={{ label: null }} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("appelle update('label', valeur) à chaque frappe", async () => {
    render(<CustomLabel update={update} settings={{ label: "" }} />);
    await userEvent.type(screen.getByRole("textbox"), "ab");
    expect(update).toHaveBeenNthCalledWith(1, "label", "a");
    expect(update).toHaveBeenNthCalledWith(2, "label", "b");
  });

  it("remonte une chaîne vide quand on efface le texte", async () => {
    render(<CustomLabel update={update} settings={{ label: "x" }} />);
    await userEvent.clear(screen.getByRole("textbox"));
    expect(update).toHaveBeenCalledWith("label", "");
  });

  it("accepte caractères spéciaux et emoji", async () => {
    render(<CustomLabel update={update} settings={{ label: "" }} />);
    await userEvent.type(screen.getByRole("textbox"), "é<>");
    expect(update).toHaveBeenCalledWith("label", "é");
    expect(update).toHaveBeenCalledWith("label", "<");
  });
});
