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

describe.each([
  ["PrimaryButton", PrimaryButton],
  ["SecondaryButton", SecondaryButton],
  ["TertiaryButton", TertiaryButton],
])("%s – attributs HTML transmis", (_name, Button) => {
  it.each(["submit", "button", "reset"] as const)("transmet type=%s au bouton", (type) => {
    render(<Button type={type}>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", type);
  });

  it("soumet un formulaire avec type=submit", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Button type="submit">Envoyer</Button></form>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Envoyer" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ne soumet pas un formulaire avec type=button", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Button type="button">Annuler</Button></form>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Annuler" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("est désactivé quand disabled et n'appelle pas onClick", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.setup().click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("est actif par défaut", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("utilise ariaLabel comme nom accessible (bouton icône)", () => {
    render(<Button ariaLabel="Fermer"><svg /></Button>);
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });
});

describe.each([
  ["PrimaryButton", PrimaryButton],
  ["SecondaryButton", SecondaryButton],
  ["TertiaryButton", TertiaryButton],
])("%s – classes CSS", (_name, Button) => {
  it("n'ajoute pas la classe littérale « undefined » quand additional est omis", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/\bundefined\b/);
  });

  it("n'ajoute pas « false » ni « null » dans les classes", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/\b(false|null)\b/);
  });

  it("applique les classes additionnelles fournies", () => {
    render(<Button additional="mt-4 w-full">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("mt-4", "w-full");
  });
});

describe("Buttons désactivés – curseur", () => {
  it("PrimaryButton utilise la classe Tailwind cursor-not-allowed (et non une classe inexistante)", () => {
    render(<PrimaryButton disabled>Go</PrimaryButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("cursor-not-allowed");
    expect(btn).not.toHaveClass("cursor-disabled");
  });
});
