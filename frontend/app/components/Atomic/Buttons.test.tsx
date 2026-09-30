import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrimaryButton, SecondaryButton, TertiaryButton } from "./Buttons";

describe("PrimaryButton", () => {
  it("affiche ses enfants dans un bouton", () => {
    render(<PrimaryButton>Valider</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Valider" })).toBeInTheDocument();
  });

  it("appelle onClick au clic", async () => {
    const onClick = vi.fn();
    render(<PrimaryButton onClick={onClick}>Go</PrimaryButton>);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applique les classes actives quand il n'est pas désactivé", () => {
    render(<PrimaryButton>Go</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn).toHaveClass("bg-vert", "rounded-full", "active:scale-95", "cursor-pointer");
    expect(btn).not.toHaveClass("bg-vert/30");
  });

  it("est désactivé et n'appelle pas onClick quand disabled", async () => {
    const onClick = vi.fn();
    render(<PrimaryButton disabled onClick={onClick}>Go</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass("bg-vert/30");
    expect(btn).not.toHaveClass("cursor-pointer");
    await userEvent.setup().click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ajoute les classes additionnelles", () => {
    render(<PrimaryButton additional="w-full py-4">Go</PrimaryButton>);
    expect(screen.getByRole("button")).toHaveClass("w-full", "py-4");
  });

  it.each(["submit", "reset", "button"] as const)("transmet type=%s", (type) => {
    render(<PrimaryButton type={type}>Go</PrimaryButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", type);
  });
});

describe("SecondaryButton", () => {
  it("affiche ses enfants et réagit au clic", async () => {
    const onClick = vi.fn();
    render(<SecondaryButton onClick={onClick}>Annuler</SecondaryButton>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("a le style actif par défaut", () => {
    render(<SecondaryButton>Annuler</SecondaryButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn).toHaveClass("border-white/10", "text1", "cursor-pointer", "rounded-full");
  });

  it("a le style grisé et bloque le clic quand disabled", async () => {
    const onClick = vi.fn();
    render(<SecondaryButton disabled onClick={onClick}>Annuler</SecondaryButton>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveClass("text3");
    expect(btn).not.toHaveClass("cursor-pointer");
    await userEvent.setup().click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ajoute les classes additionnelles", () => {
    render(<SecondaryButton additional="px-8">Annuler</SecondaryButton>);
    expect(screen.getByRole("button")).toHaveClass("px-8");
  });
});

describe("TertiaryButton", () => {
  it("affiche ses enfants et appelle onClick", async () => {
    const onClick = vi.fn();
    render(<TertiaryButton onClick={onClick}>Carte</TertiaryButton>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Carte" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("a une forme arrondie et les classes additionnelles", () => {
    render(<TertiaryButton additional="p-4">Carte</TertiaryButton>);
    expect(screen.getByRole("button")).toHaveClass("rounded-2xl", "bg-white/5", "p-4", "cursor-pointer");
  });
});
