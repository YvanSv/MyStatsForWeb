import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccordionSection } from "./AccordionSection";

describe("AccordionSection", () => {
  it("fermée par défaut : aria-expanded=false et panneau inerte", () => {
    render(<AccordionSection title="Titre"><p>contenu</p></AccordionSection>);
    const btn = screen.getByRole("button", { name: "Titre" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).toHaveAttribute("inert");
  });

  it("defaultOpen ouvre la section", () => {
    render(<AccordionSection title="Titre" defaultOpen><p>contenu</p></AccordionSection>);
    const btn = screen.getByRole("button", { name: "Titre" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).not.toHaveAttribute("inert");
  });

  it("un clic (ou Entrée) bascule l'ouverture", async () => {
    const user = userEvent.setup();
    render(<AccordionSection title="Titre"><p>contenu</p></AccordionSection>);
    const btn = screen.getByRole("button", { name: "Titre" });
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    btn.focus();
    await user.keyboard("{Enter}");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("deux sections ont des panneaux d'id distincts et un état indépendant", async () => {
    render(<><AccordionSection title="A"><p>a</p></AccordionSection><AccordionSection title="B"><p>b</p></AccordionSection></>);
    const [a, b] = [screen.getByRole("button", { name: "A" }), screen.getByRole("button", { name: "B" })];
    expect(a.getAttribute("aria-controls")).not.toBe(b.getAttribute("aria-controls"));
    await userEvent.click(a);
    expect(a).toHaveAttribute("aria-expanded", "true");
    expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("headingLevel place le bouton dans un titre du niveau demandé", () => {
    render(<AccordionSection title="Titre" headingLevel={2}><p>c</p></AccordionSection>);
    expect(screen.getByRole("heading", { level: 2, name: "Titre" })).toBeInTheDocument();
  });

  it("sans headingLevel, aucun titre n'est ajouté", () => {
    render(<AccordionSection title="Titre"><p>c</p></AccordionSection>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("scrollPanel : le panneau ouvert défile en interne (min-h-0, overflow-y-auto), l'en-tête reste hors de lui", () => {
    render(<AccordionSection title="Titre" defaultOpen scrollPanel headingLevel={2}><p>c</p></AccordionSection>);
    const btn = screen.getByRole("button", { name: "Titre" });
    const panel = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(panel).toHaveClass("min-h-0", "overflow-y-auto");
    expect(panel.contains(btn)).toBe(false);
    expect(panel.parentElement).toHaveClass("flex", "flex-col", "min-h-0");
  });

  it("scrollPanel fermé : panneau replié sans défilement", () => {
    render(<AccordionSection title="Titre" scrollPanel><p>c</p></AccordionSection>);
    const btn = screen.getByRole("button", { name: "Titre" });
    expect(document.getElementById(btn.getAttribute("aria-controls")!)).toHaveClass("max-h-0", "overflow-hidden");
  });
});
