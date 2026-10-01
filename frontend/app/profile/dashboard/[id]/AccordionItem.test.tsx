import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccordionItem from "./AccordionItem";

const onClick = vi.fn();
const icon = <svg data-testid="icon" className="text-vert" />;

beforeEach(() => {
  onClick.mockReset();
});

const root = () => screen.getByRole("heading", { level: 2, hidden: true }).closest('[class*="relative"]') as HTMLElement;

describe("AccordionItem", () => {
  it("affiche le titre dans l'en-tête de contenu (h2)", () => {
    render(<AccordionItem title="Activité" isOpen onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(screen.getByRole("heading", { level: 2, name: "Activité" })).toBeInTheDocument();
  });

  it("affiche aussi le titre vertical quand il est fermé", () => {
    render(<AccordionItem title="Activité" isOpen={false} onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(screen.getAllByText("Activité")).toHaveLength(2);
  });

  it("affiche les enfants", () => {
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}><p>Contenu</p></AccordionItem>);
    expect(screen.getByText("Contenu")).toBeInTheDocument();
  });

  it("affiche l'icône dans le titre vertical et dans l'en-tête", () => {
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(screen.getAllByTestId("icon")).toHaveLength(2);
  });

  it("affiche l'option de switch quand elle est fournie", () => {
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon} switchOption={<button>Switch</button>}>x</AccordionItem>);
    expect(screen.getByRole("button", { name: "Switch" })).toBeInTheDocument();
  });

  it("n'affiche rien de plus sans option de switch", () => {
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("applique le style ouvert (flex-[20]) quand isOpen", () => {
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(root().className).toContain("flex-[20]");
    expect(root().className).not.toContain("cursor-pointer");
  });

  it("applique le style fermé (flex-[1], curseur) quand isOpen est faux", () => {
    render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(root().className).toContain("flex-[1]");
    expect(root().className).toContain("cursor-pointer");
  });

  it("masque le contenu quand fermé et l'affiche quand ouvert (classes)", () => {
    const { rerender } = render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}><p>C</p></AccordionItem>);
    const content = () => screen.getByText("C").parentElement!.parentElement!;
    expect(content().className).toContain("invisible");
    rerender(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}><p>C</p></AccordionItem>);
    expect(content().className).toContain("opacity-100");
    expect(content().className).not.toContain("pointer-events-none");
  });

  it("un clic sur l'élément appelle onClick", async () => {
    const user = userEvent.setup();
    render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}>x</AccordionItem>);
    await user.click(screen.getAllByText("T")[0]);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("un clic dans le contenu ouvert remonte aussi à onClick", async () => {
    const user = userEvent.setup();
    render(<AccordionItem title="T" isOpen onClick={onClick} icon={icon}><p>Dedans</p></AccordionItem>);
    await user.click(screen.getByText("Dedans"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("le panneau fermé est accessible au clavier (rôle bouton, focusable, aria-expanded)", async () => {
    const user = userEvent.setup();
    render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}>x</AccordionItem>);
    const trigger = screen.getByRole("button", { name: /T/, expanded: false });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("le contenu fermé est masqué aux technologies d'assistance (aria-hidden)", () => {
    render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}><p>Secret</p></AccordionItem>);
    expect(screen.getByText("Secret").parentElement!.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("ne plante pas quand aucune icône n'est fournie", () => {
    expect(() => render(<AccordionItem title="T" isOpen onClick={onClick}>x</AccordionItem>)).not.toThrow();
  });

  it("affiche l'indicateur de clic (svg pointeur) avec la classe de l'icône", () => {
    const { container } = render(<AccordionItem title="T" isOpen={false} onClick={onClick} icon={icon}>x</AccordionItem>);
    expect(container.querySelector("svg.lucide-pointer")).toHaveClass("text-vert");
  });
});
